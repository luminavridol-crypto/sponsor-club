import { redirect } from "next/navigation";

export default async function AuthAliasPage() {
  redirect("/login?mode=register&next=%2Fpath");
}
