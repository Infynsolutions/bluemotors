import { createClient } from "@supabase/supabase-js";

// Server-side client with service role key — only use in Server Components / API routes
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const DOCUMENTS_BUCKET = "documentos";

export async function getSignedDocumentUrl(fileKey: string): Promise<string> {
  const { data, error } = await supabaseAdmin.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(fileKey, 900); // 15 minutes

  if (error || !data) throw new Error(`Failed to sign URL: ${error?.message}`);
  return data.signedUrl;
}
