import { getActor } from "@/lib/session";
import { profilePictures } from "@/lib/profile-pictures";
import { pictureResponse } from "@/lib/file-response";

/**
 * A user's Profile picture, for signed-in people only. Its address carries a
 * version (`?v=`) taken from when it was set, so a new picture gets a new
 * address; the version itself isn't checked.
 */
export async function GET(_: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  return pictureResponse(await profilePictures.read(await getActor(), userId));
}
