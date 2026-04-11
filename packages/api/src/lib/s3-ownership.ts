import { prisma } from "@steady/db";

/**
 * Verify that the authenticated user owns or has clinical access to a file
 * stored in S3 at the given key.
 *
 * Key format: uploads/{profileOrUserId}/{context}/{uuid}.{ext}
 *
 * Ownership is granted if:
 * 1. The userId segment matches any of the user's IDs (userId, clinicianProfileId, participantProfileId), OR
 * 2. The authenticated user is a clinician and has a ClinicianClient relationship
 *    where the file owner (userId segment) is the client's userId.
 */
export async function verifyFileOwnership(
  key: string,
  user: {
    userId: string;
    clinicianProfileId?: string;
    participantProfileId?: string;
  }
): Promise<boolean> {
  // Parse the userId segment from the key: uploads/{userId}/{context}/{file}
  const segments = key.split("/");
  if (segments.length < 3 || segments[0] !== "uploads") {
    return false;
  }

  const fileOwnerId = segments[1];

  // Direct ownership: the file owner matches the user's ID or profile IDs
  if (
    fileOwnerId === user.userId ||
    fileOwnerId === user.clinicianProfileId ||
    fileOwnerId === user.participantProfileId
  ) {
    return true;
  }

  // Clinician access: check if the file owner is one of the clinician's clients
  if (user.clinicianProfileId) {
    // The fileOwnerId could be a User.id or a ParticipantProfile.id.
    // Check both: clientId (User.id) match, or look up the user by participantProfile.id.
    const relationship = await prisma.clinicianClient.findFirst({
      where: {
        clinicianId: user.clinicianProfileId,
        OR: [
          { clientId: fileOwnerId },
          {
            client: {
              participantProfile: { id: fileOwnerId },
            },
          },
        ],
      },
      select: { id: true },
    });

    if (relationship) {
      return true;
    }
  }

  return false;
}
