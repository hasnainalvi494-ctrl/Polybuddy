import { redirect } from "next/navigation";

// Redirect /daily to the Pulse homepage
export default function DailyPage() {
  redirect("/");
}
