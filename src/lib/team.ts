export type TeamMember = {
  name: string;
  /** Public path, e.g. /team/shreyansh.webp; null uses an initials avatar. */
  photoPath: string | null;
  githubUrl: string | null;
  linkedinUrl: string | null;
};

export const teamCredits = {
  statement:
    "Developed for the IITJ QFF'26 Hackathon by team Schrodinger's Hackers.",
  members: [
    {
      name: "Shreyansh Agarwal",
      photoPath: null,
      githubUrl: "https://github.com/Shreyansh9878",
      linkedinUrl: null,
    },
    {
      name: "Vihan Karnik",
      photoPath: null,
      githubUrl: null,
      linkedinUrl: null,
    },
    {
      name: "Sarthak Sharma",
      photoPath: null,
      githubUrl: null,
      linkedinUrl: null,
    },
  ] satisfies TeamMember[],
};
