import { backendEnabled } from "../env";
import type { DataLayer } from "./contract";
import { fakeData } from "./fake";
import { supabaseData } from "./supabase";

// Screens import `data` from here and nothing else. With Supabase configured the real layer runs;
// without it the app is a self-contained demo on this device.
export const data: DataLayer = backendEnabled ? supabaseData : fakeData;

export * from "./contract";
