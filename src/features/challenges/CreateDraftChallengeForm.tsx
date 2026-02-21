"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "convex/react";
import { Loader2, Rocket, Target, Zap } from "lucide-react";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCipherForgeAuth } from "@/features/auth/CipherForgeAuthProvider";
import {
  hashSecretWord,
  toPaddedSecretWordBytes,
} from "@/features/zk/services/secretWordHash";
import { createSecretWordDraftChallengeRef } from "@/lib/convex/function-references";

const gamePresets = [
  {
    id: "pong",
    title: "Pong Duel",
    description: "Competitive paddle rally challenge.",
    icon: Target,
    placeholder: "Enter a private victory code (max 16 printable chars)",
    pattern: /^[\x20-\x7E]{1,16}$/u,
    patternMessage: "Use 1-16 printable characters.",
  },
  {
    id: "snake",
    title: "Snake Run",
    description: "Arcade survival score challenge.",
    icon: Zap,
    placeholder: "Enter a private victory code (max 16 printable chars)",
    pattern: /^[\x20-\x7E]{1,16}$/u,
    patternMessage: "Use 1-16 printable characters.",
  },
  {
    id: "asteroids",
    title: "Asteroids",
    description: "Space survival score challenge.",
    icon: Rocket,
    placeholder: "Enter a private victory code (max 16 printable chars)",
    pattern: /^[\x20-\x7E]{1,16}$/u,
    patternMessage: "Use 1-16 printable characters.",
  },
] as const;

type GamePresetId = (typeof gamePresets)[number]["id"];
const gamePresetSchema = z.enum([
  "pong",
  "snake",
  "asteroids",
]);

const createDraftSchema = z.object({
  gamePreset: gamePresetSchema,
  title: z.string().trim().min(3, "Title should be at least 3 characters.").max(80),
  description: z.string().trim().max(1200),
  secretWord: z.string(),
});

type CreateDraftFormValues = z.infer<typeof createDraftSchema>;

const defaultValues: CreateDraftFormValues = {
  gamePreset: "pong",
  title: "",
  description: "",
  secretWord: "",
};

function presetById(id: GamePresetId) {
  return gamePresets.find((preset) => preset.id === id) ?? gamePresets[0];
}

function normalizeInputByPreset(value: string, preset: GamePresetId) {
  void preset;
  return value.trim();
}

export function CreateDraftChallengeForm() {
  const createSecretWordDraft = useMutation(createSecretWordDraftChallengeRef);
  const { isAuthenticated } = useCipherForgeAuth();

  const form = useForm<CreateDraftFormValues>({
    resolver: zodResolver(createDraftSchema),
    defaultValues,
  });

  const isSubmitting = form.formState.isSubmitting;
  const gamePreset = form.watch("gamePreset");
  const secretWordValue = form.watch("secretWord");
  const activePreset = presetById(gamePreset);

  const expectedHashPreview = useMemo(() => {
    const normalizedInput = normalizeInputByPreset(secretWordValue ?? "", gamePreset);
    if (!normalizedInput || !activePreset.pattern.test(normalizedInput)) {
      return null;
    }

    try {
      toPaddedSecretWordBytes(normalizedInput);
      return hashSecretWord(normalizedInput);
    } catch {
      return null;
    }
  }, [activePreset.pattern, gamePreset, secretWordValue]);

  async function onSubmit(values: CreateDraftFormValues) {
    if (!isAuthenticated) {
      toast.error("Sign in with SEP-10 before creating a challenge.");
      return;
    }

    const normalizedInput = normalizeInputByPreset(
      values.secretWord,
      values.gamePreset,
    );

    if (!normalizedInput) {
      toast.error("A victory code is required for this challenge.");
      return;
    }

    const selectedPreset = presetById(values.gamePreset);
    if (!selectedPreset.pattern.test(normalizedInput)) {
      toast.error(selectedPreset.patternMessage);
      return;
    }

    try {
      toPaddedSecretWordBytes(normalizedInput);
      await createSecretWordDraft({
        title: values.title,
        description: values.description,
        expectedHashHex: hashSecretWord(normalizedInput),
        gamePreset: values.gamePreset,
      });

      toast.success("Challenge draft created. Publish it from My Drafts.");
      form.reset(defaultValues);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to create challenge draft.",
      );
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">ZK game preset</legend>
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {gamePresets.map((preset) => {
            const Icon = preset.icon;
            const isActive = gamePreset === preset.id;
            return (
              <Button
                key={preset.id}
                type="button"
                variant={isActive ? "default" : "secondary"}
                className="h-auto justify-start p-3 text-left whitespace-normal break-words"
                onClick={() =>
                  form.setValue("gamePreset", preset.id, {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
              >
                <div className="space-y-1 min-w-0">
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <Icon className="h-4 w-4" />
                    {preset.title}
                  </p>
                  <p className="text-xs opacity-85 break-words leading-snug">
                    {preset.description}
                  </p>
                </div>
              </Button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          Pick the arcade game first. This draft step stores only a commitment
          hash for your private victory code. The actual ZK proof is generated
          later on the prove page.
        </p>
      </fieldset>

      <div className="space-y-2">
        <label htmlFor="challenge-title" className="text-sm font-medium">
          Challenge title
        </label>
        <Input
          id="challenge-title"
          placeholder="Cipher Grid #12"
          {...form.register("title")}
        />
        <p className="text-sm text-destructive">{form.formState.errors.title?.message}</p>
        <p className="text-xs text-muted-foreground">
          Make this concise and descriptive so challengers know what they are solving.
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="challenge-description" className="text-sm font-medium">
          Challenge description (optional)
        </label>
        <Textarea
          id="challenge-description"
          rows={5}
          placeholder="Add theme, difficulty, or match context for challengers."
          {...form.register("description")}
        />
        <p className="text-sm text-destructive">
          {form.formState.errors.description?.message}
        </p>
        <p className="text-xs text-muted-foreground">
          Rules are fixed by the selected arcade game. Use this for flavor and context.
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="challenge-key" className="text-sm font-medium">
          {activePreset.title} victory code
        </label>
        <Input
          id="challenge-key"
          type="password"
          placeholder={activePreset.placeholder}
          {...form.register("secretWord")}
        />
        <p className="text-xs text-muted-foreground">{activePreset.patternMessage}</p>
        <p className="text-xs text-muted-foreground">
          Stored as a commitment hash only. The plaintext value is never saved.
        </p>
        <p className="text-sm text-destructive">
          {form.formState.errors.secretWord?.message}
        </p>
        {expectedHashPreview ? (
          <p className="break-all rounded-md border bg-muted/40 px-3 py-2 font-mono text-xs text-muted-foreground">
            Commitment preview: {expectedHashPreview}
          </p>
        ) : null}
      </div>

      <Button type="submit" className="min-w-40" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Creating...
          </>
        ) : (
          "Create Draft"
        )}
      </Button>
    </form>
  );
}
