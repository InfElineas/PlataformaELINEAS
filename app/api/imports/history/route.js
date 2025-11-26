import { NextResponse } from "next/server";
import { requirePermission, PERMISSIONS } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import ImportJob from "@/lib/models/ImportJob";

export async function GET(request) {
  const session = await requirePermission(request, PERMISSIONS.IMPORTS_MANAGE);
  await connectDB();
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "25", 10);

  const jobs = await ImportJob.find({ org_id: session.orgId })
    .sort({ created_at: -1 })
    .limit(Math.min(limit, 100))
    .populate("user_id", ["full_name", "email"])
    .lean();

  const data = jobs.map((job) => ({
    id: job._id.toString(),
    type: job.type,
    source: job.source,
    file_name: job.file_name,
    sheet_name: job.sheet_name,
    sheet_count: job.sheet_count,
    total_rows: job.total_rows,
    imported: job.imported,
    updated: job.updated,
    duplicates: job.duplicates,
    failed: job.failed,
    status: job.status,
    errors: job.errors || [],
    created_at: job.created_at,
    user: job.user_id
      ? {
          id: job.user_id._id?.toString() || job.user_id.toString(),
          full_name: job.user_id.full_name,
          email: job.user_id.email,
        }
      : null,
  }));

  return NextResponse.json({ ok: true, data });
}
