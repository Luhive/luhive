import { useState } from "react";
import { Download, Instagram, Link as LinkIcon, Linkedin, Loader2, MoreHorizontal, PenLine } from "lucide-react";
import { toast } from "sonner";
import * as Certificate from "~/modules/certificates/model/certificate";
import type { CertificateShareLinks } from "~/modules/certificates/server/certificate-loader.server";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/shared/components/ui/dropdown-menu";
import { Routes } from "~/shared/lib/routing/routes";

const press =
  "outline-none transition-[transform,background-color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] focus-visible:ring-2 focus-visible:ring-[#111]/20 active:scale-[0.97]";
const textButton = `inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full px-3 text-[14px] whitespace-nowrap sm:px-4 sm:text-[15px] font-medium text-[#111] [@media(hover:hover)]:hover:bg-black/[0.04] disabled:opacity-60 ${press}`;
const iconButton = `inline-flex size-10 shrink-0 items-center justify-center rounded-full text-[#111] [@media(hover:hover)]:hover:bg-black/[0.04] ${press}`;

type Props = {
  cert: Certificate.PublicCertificate;
  imageUrl: string;
  links: CertificateShareLinks;
};

function saveFile(file: File) {
  const url = URL.createObjectURL(file);
  const link = Object.assign(document.createElement("a"), { href: url, download: file.name });
  link.click();
  URL.revokeObjectURL(url);
}

/** Count the share without making the person wait: a beacon survives opening a new tab. */
function track(code: string, channel: Certificate.ShareChannel) {
  const body = new FormData();
  body.set("code", code);
  body.set("channel", channel);
  if (!navigator.sendBeacon?.(Routes.api.certificates.share, body)) {
    void fetch(Routes.api.certificates.share, { method: "POST", body, keepalive: true }).catch(() => {});
  }
}

// The owner's actions. Two core ones (LinkedIn certification, Instagram story); the
// LinkedIn post, copy and download sit in the ⋯ menu. Nothing posts on anyone's
// behalf: each opens a form, a composer, the share sheet, or copies.
export function CertificateShareBar({ cert, imageUrl, links }: Props) {
  const [preparingStory, setPreparingStory] = useState(false);
  const tags = [`@${Certificate.LUHIVE_INSTAGRAM}`, links.communityInstagram].filter(Boolean).join(" and ");

  // LinkedIn turns a typed "@Luhive" into a mention only when picked from its list, so
  // the caption is prefilled (and copied, in case the composer drops it) with a hint.
  async function writePost() {
    track(cert.code, "linkedin_post");
    window.open(links.linkedInPostUrl, "_blank", "noopener,noreferrer");
    await navigator.clipboard?.writeText(links.linkedInCaption).catch(() => {});
    toast.success("Your post is ready in LinkedIn", {
      description: "Retype @Luhive and pick Luhive from the list to tag us. We reshare posts that tag us.",
      duration: 8000,
    });
  }

  function addToProfile() {
    track(cert.code, "linkedin_profile");
    // The certificate sits quietly in Licenses; a post is what people see. Offer it next.
    toast("Added it to your profile?", {
      description: "Tell your network too. Your post is written, ready to edit.",
      action: { label: "Write post", onClick: () => void writePost() },
      duration: 12000,
    });
  }

  async function copyLink() {
    track(cert.code, "copy_link");
    try {
      await navigator.clipboard.writeText(links.copyUrl);
      toast.success("Link copied");
    } catch {
      toast.error("Couldn't copy. Copy the address bar instead.");
    }
  }

  // Instagram has no web link for stories, and a web page can't add mention stickers.
  // On phones the share sheet takes the image straight to Instagram; elsewhere it's saved.
  async function shareToStory() {
    track(cert.code, "instagram_story");
    setPreparingStory(true);
    try {
      const blob = await fetch(links.storyImageUrl).then((response) => {
        if (!response.ok) throw new Error(String(response.status));
        return response.blob();
      });
      const file = new File([blob], Certificate.imageFileName(cert).replace(/\.png$/, "-story.png"), {
        type: "image/png",
      });
      const tagPrompt = `Tag ${tags} in your story. We repost every one.`;
      if (navigator.canShare?.({ files: [file] })) {
        toast(tagPrompt, { duration: 10000 });
        await navigator.share({ files: [file] }).catch(() => {});
        return;
      }
      saveFile(file);
      toast.success("Story image saved", {
        description: `Open Instagram on your phone, add it to your story and tag ${tags}. We repost every one.`,
        duration: 10000,
      });
    } catch {
      toast.error("Couldn't prepare the story image. Try again.");
    } finally {
      setPreparingStory(false);
    }
  }

  return (
    <div className="flex items-center justify-center gap-0.5 sm:gap-1">
      <a
        href={links.linkedInProfileUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={addToProfile}
        aria-label="Add certificate to LinkedIn"
        className={textButton}
      >
        <Linkedin className="size-[18px] text-[#0A66C2]" aria-hidden />
        {/* Short labels on phones keep all three actions on one row. */}
        <span className="sm:hidden">Add to LinkedIn</span>
        <span className="hidden sm:inline">Add certificate to LinkedIn</span>
      </a>
      <button
        type="button"
        onClick={shareToStory}
        disabled={preparingStory}
        aria-busy={preparingStory}
        aria-label="Share to Instagram story"
        className={textButton}
      >
        <span className="icon-swap grid size-[18px] place-items-center text-[#DD2A7B]" aria-hidden>
          <Instagram className="size-[18px]" data-hidden={preparingStory} />
          <Loader2 className={`size-[18px] ${preparingStory ? "animate-spin" : ""}`} data-hidden={!preparingStory} />
        </span>
        <span className="sm:hidden">Share story</span>
        <span className="hidden sm:inline">Share to Instagram story</span>
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" aria-label="More options" className={iconButton}>
            <MoreHorizontal className="size-5 text-[#111]" aria-hidden />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => void writePost()}>
            <PenLine className="size-4" aria-hidden />
            Write a LinkedIn post
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => void copyLink()}>
            <LinkIcon className="size-4" aria-hidden />
            Copy link
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a href={imageUrl} download={Certificate.imageFileName(cert)} onClick={() => track(cert.code, "download")}>
              <Download className="size-4" aria-hidden />
              Download image
            </a>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
