import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://oqukilrmabwaovxgtbzy.supabase.co";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_Xn1eLRkvPi9dPyxHmftaAA_oQfxWh6D";

export const createClient = () =>
  createBrowserClient(
    supabaseUrl,
    supabaseKey,
  );
