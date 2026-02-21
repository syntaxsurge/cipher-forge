import { redirect } from "next/navigation";

export default function MyChallengesPage() {
  redirect("/forge?tab=drafts");
}
