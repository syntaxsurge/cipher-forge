import { redirect } from "next/navigation";

export default function NewChallengePage() {
  redirect("/forge?tab=create");
}
