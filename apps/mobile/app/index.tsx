import { Redirect } from "expo-router";
import { getPostLoginPath, getUser, isAuthenticated } from "@/lib/auth";

export default function IndexScreen() {
  if (!isAuthenticated()) {
    return <Redirect href="/(auth)/login" />;
  }

  return <Redirect href={getPostLoginPath(getUser())} />;
}
