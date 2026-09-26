"use client";
import { useParams } from "next/navigation";
import { ServerSessionList } from "@/components/domain/server-session-list";
export default function ProjectSessionsPage() { const { id } = useParams<{ id: string }>(); return <ServerSessionList key={id} projectId={id} />; }
