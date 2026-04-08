/**
 * DELETE /api/parent/delete-account — delete a child's data or the entire parent account.
 * Body: { childId?: string, deleteParent?: boolean }
 *
 * - childId: verify ownership → delete children row (CASCADE handles dependents) → delete parent_child link
 * - deleteParent: delete all linked children (CASCADE) → delete parent_child links → delete parent auth user
 *
 * Requires service role for deletion. Returns 503 if admin client is not configured.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdminOptional } from '@/lib/supabase/server-admin';

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = getSupabaseAdminOptional();
  if (!admin) {
    return NextResponse.json(
      { error: 'Account deletion is not available in this environment' },
      { status: 503 }
    );
  }

  let body: { childId?: string; deleteParent?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { childId, deleteParent } = body ?? {};

  if (childId) {
    const id = typeof childId === 'string' ? childId.trim() : '';
    if (!id) {
      return NextResponse.json({ error: 'childId must be a non-empty string' }, { status: 400 });
    }

    // Verify ownership
    const { data: link, error: linkError } = await supabase
      .from('parent_child')
      .select('child_id')
      .eq('parent_id', user.id)
      .eq('child_id', id)
      .maybeSingle();

    if (linkError) {
      console.error('[delete-account] ownership check', linkError);
      return NextResponse.json({ error: 'Failed to verify ownership' }, { status: 500 });
    }
    if (!link) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete children row — CASCADE handles all dependent tables
    const { error: deleteChildError } = await admin
      .from('children')
      .delete()
      .eq('id', id);

    if (deleteChildError) {
      console.error('[delete-account] delete children', deleteChildError);
      return NextResponse.json({ error: 'Failed to delete child data' }, { status: 500 });
    }

    // Delete parent_child link
    const { error: deleteLinkError } = await admin
      .from('parent_child')
      .delete()
      .eq('parent_id', user.id)
      .eq('child_id', id);

    if (deleteLinkError) {
      // Non-fatal: child row is already deleted; log and continue
      console.error('[delete-account] delete parent_child link', deleteLinkError);
    }

    return NextResponse.json({ ok: true, deletedChildId: id });
  }

  if (deleteParent) {
    // Get all children linked to this parent
    const { data: links, error: linksError } = await supabase
      .from('parent_child')
      .select('child_id')
      .eq('parent_id', user.id);

    if (linksError) {
      console.error('[delete-account] fetch linked children', linksError);
      return NextResponse.json({ error: 'Failed to load linked children' }, { status: 500 });
    }

    const childIds = (links ?? []).map((r) => r.child_id);

    // Delete each children row (CASCADE handles dependents)
    for (const cid of childIds) {
      const { error } = await admin.from('children').delete().eq('id', cid);
      if (error) {
        console.error('[delete-account] delete child', cid, error);
        return NextResponse.json({ error: `Failed to delete child data for ${cid}` }, { status: 500 });
      }
    }

    // Delete all parent_child links for this parent
    const { error: deleteLinksError } = await admin
      .from('parent_child')
      .delete()
      .eq('parent_id', user.id);

    if (deleteLinksError) {
      console.error('[delete-account] delete parent_child links', deleteLinksError);
      // Non-fatal: children are deleted; proceed to delete auth user
    }

    // Delete parent auth user via service role
    const { error: deleteUserError } = await admin.auth.admin.deleteUser(user.id);
    if (deleteUserError) {
      console.error('[delete-account] deleteUser', deleteUserError);
      return NextResponse.json({ error: 'Failed to delete parent account' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, deletedParentId: user.id });
  }

  return NextResponse.json(
    { error: 'Provide childId or deleteParent: true' },
    { status: 400 }
  );
}
