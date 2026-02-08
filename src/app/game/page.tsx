"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function GamePage() {
  const [playerName, setPlayerName] = useState<string | null>(null);
  const [players, setPlayers] = useState<string[]>([]);
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem("playerName");
    if (!stored) {
      router.replace("/");
      return;
    }
    setPlayerName(stored);
    setPlayers(JSON.parse(localStorage.getItem("players") || "[]"));
  }, [router]);

  if (!playerName) return null;

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl">Up and Back</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <p className="text-center text-lg text-muted-foreground">
            Welcome, <span className="font-semibold text-foreground">{playerName}</span>!
          </p>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">#</TableHead>
                <TableHead>Player</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {players.map((name, i) => (
                <TableRow key={name}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell>
                    {name}
                    {name === playerName && (
                      <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
