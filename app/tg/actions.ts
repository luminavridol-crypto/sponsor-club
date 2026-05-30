"use server";

import { redirect } from "next/navigation";
import { clearTelegramSession } from "@/lib/telegram/session";

export async function signOutTelegramAction() {
  await clearTelegramSession();
  redirect("/tg");
}
