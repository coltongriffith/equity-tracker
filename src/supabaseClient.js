import { createClient } from "@supabase/supabase-js";
 
const supabaseUrl = "https://nigtgxhnwkumymohkmfj.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pZ3RneGhud2t1bXltb2hrbWZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NzMzMjMsImV4cCI6MjA5MDA0OTMyM30.IMdMDUjp2cGQohhcb21lc628NSh-dEENZ6WrldDbcLQ";
 
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
 
