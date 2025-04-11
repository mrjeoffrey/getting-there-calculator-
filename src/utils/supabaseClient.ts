// utils/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://iwfzuqqmewdodmfolwxo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3Znp1cXFtZXdkb2RtZm9sd3hvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQzODU3MjMsImV4cCI6MjA1OTk2MTcyM30.N4qSXjujWb98bkfOxSvYryKRqUE-Zhs8JMqBhC0HZ-Q'; // use service key on server side
export const supabase = createClient(supabaseUrl, supabaseKey);
