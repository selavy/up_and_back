"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function WelcomePage() {
  const [name, setName] = useState("");
  const router = useRouter();

  function handleJoin() {
    const trimmed = name.trim();
    if (!trimmed) return;
    localStorage.setItem("playerName", trimmed);

    const existing: string[] = JSON.parse(localStorage.getItem("players") || "[]");
    if (!existing.includes(trimmed)) {
      existing.push(trimmed);
      localStorage.setItem("players", JSON.stringify(existing));
    }

    router.push("/game");
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl">Up and Back</CardTitle>
          <CardDescription>Enter your name to join the game</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleJoin();
            }}
            className="flex flex-col gap-4"
          >
            <Input
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
            <Button type="submit" disabled={!name.trim()}>
              Join Game
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
