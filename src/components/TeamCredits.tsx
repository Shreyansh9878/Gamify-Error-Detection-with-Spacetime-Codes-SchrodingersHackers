"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Github, Linkedin, X } from "lucide-react";
import { teamCredits, type TeamMember } from "@/lib/team";
import styles from "./TeamCredits.module.css";

function MemberCard({ member }: { member: TeamMember }) {
  const [failedPhoto, setFailedPhoto] = useState<string | null>(null);
  const photo = member.photoPath?.trim();
  const initials = member.name
    .split(/\s+/)
    .map((part) => part[0])
    .join("");
  return (
    <li className={styles.card}>
      <div className={styles.avatar}>
        {photo && failedPhoto !== photo ? (
          <Image
            src={photo}
            alt={`Portrait of ${member.name}`}
            width={160}
            height={160}
            sizes="80px"
            loading="lazy"
            onError={() => setFailedPhoto(photo)}
          />
        ) : (
          <span aria-hidden="true">{initials}</span>
        )}
      </div>
      <h3>{member.name}</h3>
      {(member.githubUrl || member.linkedinUrl) && (
        <div className={styles.links}>
          {member.githubUrl && (
            <a
              href={member.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${member.name} on GitHub (opens in a new tab)`}
            >
              <Github size={16} aria-hidden="true" /> GitHub
            </a>
          )}
          {member.linkedinUrl && (
            <a
              href={member.linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${member.name} on LinkedIn (opens in a new tab)`}
            >
              <Linkedin size={16} aria-hidden="true" /> LinkedIn
            </a>
          )}
        </div>
      )}
    </li>
  );
}

/** Mounted only on Mission control, never inside a tutorial or mission workspace. */
export function TeamCredits() {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  return (
    <footer className={styles.footer} aria-label="Team credits">
      <p>{teamCredits.statement}</p>
      <button
        ref={trigger}
        type="button"
        aria-haspopup="dialog"
        onClick={() => dialog.current?.showModal()}
      >
        About the team
      </button>
      <small>
        Personal progress stays on this device. No quantum hardware account is
        required.
      </small>
      <dialog
        ref={dialog}
        className={styles.dialog}
        aria-labelledby="team-title"
        aria-describedby="team-description"
        onClose={() => trigger.current?.focus()}
      >
        <div className={styles.heading}>
          <div>
            <p className="eyebrow">THE PEOPLE BEHIND QUANTUM SHIELD</p>
            <h2 id="team-title">Schrodinger&apos;s Hackers</h2>
          </div>
          <button
            type="button"
            aria-label="Close About"
            onClick={() => dialog.current?.close()}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <p id="team-description">{teamCredits.statement}</p>
        <ul className={styles.members}>
          {teamCredits.members.map((member) => (
            <MemberCard key={member.name} member={member} />
          ))}
        </ul>
      </dialog>
    </footer>
  );
}
