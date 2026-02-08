"use client";

import { useEffect, useState } from "react";
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
  const [gameStarted, setGameStarted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function checkGameState() {
      const res = await fetch("/api/game");
      const data = await res.json();
      setGameStarted(data.started);
    }

    checkGameState();
    const interval = setInterval(checkGameState, 5000);
    return () => clearInterval(interval);
  }, []);

  async function handleJoin() {
    const trimmed = name.trim();
    if (!trimmed) return;

    const res = await fetch("/api/players", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });

    if (!res.ok) {
      const data = await res.json();
      if (res.status === 403) {
        setGameStarted(true);
      }
      alert(data.error || "Failed to join");
      return;
    }

    const data = await res.json();
    localStorage.setItem("playerName", data.name);

    router.push("/game");
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl">Up and Back</CardTitle>
          <CardDescription>
            {gameStarted
              ? "Game already in progress"
              : "Enter your name to join the game"}
          </CardDescription>
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
              disabled={gameStarted}
            />
            <Button type="submit" disabled={!name.trim() || gameStarted}>
              Join Game
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
