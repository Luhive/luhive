import { useEffect, useState, type ClipboardEvent } from "react";
import { ArrowUpRight } from "lucide-react";
import { ProfileSocialLogo } from "~/modules/profile/components/profile-social-logo";
import { ProfileLinks } from "~/modules/profile/model/profile-social-links";

type SocialHandleFieldProps = {
  id: ProfileLinks.Id;
  links?: ProfileLinks.Map;
  disabled?: boolean;
  required?: boolean;
  value?: string;
  onValueChange?: (value: string) => void;
};

export function SocialHandleField({
  id,
  links,
  disabled = false,
  required = false,
  value: controlledValue,
  onValueChange,
}: SocialHandleFieldProps) {
  const [value, setValue] = useState(() => controlledValue ?? ProfileLinks.handle(id, links?.[id] ?? null));
  const previewUrl = ProfileLinks.url(id, value);
  const previewHandle = ProfileLinks.usernameFromPaste(id, value);

  useEffect(() => {
    if (controlledValue !== undefined) setValue(controlledValue);
  }, [controlledValue]);

  function updateValue(next: string) {
    setValue(next);
    onValueChange?.(next);
  }

  function keepUsername(event: ClipboardEvent<HTMLInputElement>) {
    const pasted = event.clipboardData.getData("text");
    const username = ProfileLinks.usernameFromPaste(id, pasted);
    if (!username || username === pasted) return;

    event.preventDefault();
    const input = event.currentTarget;
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;
    updateValue(`${input.value.slice(0, start)}${username}${input.value.slice(end)}`);
  }

  return (
    <div className="min-w-0 space-y-1.5">
      <label className="flex h-11 min-w-0 overflow-hidden rounded-xl border border-black/[0.08] bg-white transition-[border-color,box-shadow] duration-150 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30">
        <span className="flex shrink-0 items-center gap-2 border-r border-black/[0.06] bg-white px-3 text-[13px] text-[#8c8e9a]">
          <ProfileSocialLogo id={id} className="size-3.5" />
          {ProfileLinks.prefix(id)}
        </span>
        <input
          name={onValueChange ? undefined : id}
          value={value}
          onChange={(event) => updateValue(event.target.value)}
          disabled={disabled}
          required={required}
          placeholder={ProfileLinks.placeholder(id)}
          onPaste={keepUsername}
          className="min-w-0 flex-1 bg-transparent px-3 text-[14px] text-[#111] outline-none disabled:opacity-60"
        />
      </label>
      <a
        href={previewUrl ?? ProfileLinks.findUrl(id)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex max-w-full items-center gap-1 px-1 text-[12px] text-[#8c8e9a] outline-none hover:text-[#111] focus-visible:text-[#111]"
      >
        <span className="truncate">{previewUrl ? `Check @${previewHandle}` : "Find yours"}</span>
        <ArrowUpRight className="size-3 shrink-0" aria-hidden />
      </a>
    </div>
  );
}
