"use client";

import { useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GlassCard } from "@/components/effects/glass-card";
import { buildContactSchema, type ContactInput } from "@/lib/validations";
import { REQUEST_TYPES, BUDGETS } from "@/lib/constants";
import { cn } from "@/lib/utils";

function FieldShell({
  label,
  htmlFor,
  error,
  optionalLabel,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  optionalLabel?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
        {optionalLabel ? (
          <span className="ml-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {optionalLabel}
          </span>
        ) : null}
      </Label>
      {children}
      <p
        className="min-h-4 text-xs text-destructive"
        role="alert"
        aria-live="polite"
      >
        {error}
      </p>
    </div>
  );
}

export function ContactForm() {
  const tf = useTranslations("contact.form");
  const tv = useTranslations("contact.validation");
  const ts = useTranslations("contact.success");
  const tt = useTranslations("contact.toast");
  const [submitted, setSubmitted] = useState(false);

  const schema = useMemo(() => buildContactSchema((k) => tv(k)), [tv]);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      company: "",
      email: "",
      phone: "",
      requestType: "",
      league: "",
      budget: "",
      message: "",
    },
  });

  async function onSubmit(values: ContactInput) {
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error("request_failed");
      toast.success(tt("successTitle"), { description: tt("successDesc") });
      reset();
      setSubmitted(true);
    } catch {
      toast.error(tt("errorTitle"), { description: tt("errorDesc") });
    }
  }

  if (submitted) {
    return (
      <GlassCard
        strong
        className="flex flex-col items-center gap-4 px-6 py-14 text-center sm:px-12"
      >
        <span className="grid size-16 place-items-center rounded-full border border-led/30 bg-led/10 text-led">
          <CheckCircle2 className="size-8" />
        </span>
        <h3 className="font-display text-2xl font-bold uppercase tracking-tight">
          {ts("title")}
        </h3>
        <p className="max-w-md text-muted-foreground">{ts("desc")}</p>
        <Button
          variant="outline"
          className="mt-2 h-11 rounded-xl px-5"
          onClick={() => setSubmitted(false)}
        >
          {ts("again")}
        </Button>
      </GlassCard>
    );
  }

  return (
    <GlassCard strong className="p-6 sm:p-8">
      <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col">
        <div className="grid gap-x-5 sm:grid-cols-2">
          <FieldShell
            label={tf("name.label")}
            htmlFor="name"
            error={errors.name?.message}
          >
            <Input
              id="name"
              autoComplete="name"
              placeholder={tf("name.placeholder")}
              aria-invalid={!!errors.name}
              {...register("name")}
            />
          </FieldShell>

          <FieldShell
            label={tf("company.label")}
            htmlFor="company"
            error={errors.company?.message}
          >
            <Input
              id="company"
              autoComplete="organization"
              placeholder={tf("company.placeholder")}
              aria-invalid={!!errors.company}
              {...register("company")}
            />
          </FieldShell>

          <FieldShell
            label={tf("email.label")}
            htmlFor="email"
            error={errors.email?.message}
          >
            <Input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder={tf("email.placeholder")}
              aria-invalid={!!errors.email}
              {...register("email")}
            />
          </FieldShell>

          <FieldShell
            label={tf("phone.label")}
            htmlFor="phone"
            error={errors.phone?.message}
          >
            <Input
              id="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder={tf("phone.placeholder")}
              aria-invalid={!!errors.phone}
              {...register("phone")}
            />
          </FieldShell>

          <FieldShell
            label={tf("requestType.label")}
            htmlFor="requestType"
            error={errors.requestType?.message}
          >
            <Controller
              control={control}
              name="requestType"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger
                    id="requestType"
                    className="w-full"
                    aria-invalid={!!errors.requestType}
                  >
                    <SelectValue placeholder={tf("requestType.placeholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {REQUEST_TYPES.map((key) => (
                      <SelectItem key={key} value={key}>
                        {tf(`requestTypes.${key}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FieldShell>

          <FieldShell
            label={tf("budget.label")}
            htmlFor="budget"
            optionalLabel={tf("optional")}
            error={errors.budget?.message}
          >
            <Controller
              control={control}
              name="budget"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="budget" className="w-full">
                    <SelectValue placeholder={tf("budget.placeholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {BUDGETS.map((key) => (
                      <SelectItem key={key} value={key}>
                        {tf(`budgets.${key}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FieldShell>

          <FieldShell
            label={tf("league.label")}
            htmlFor="league"
            optionalLabel={tf("optional")}
            error={errors.league?.message}
            className="sm:col-span-2"
          >
            <Input
              id="league"
              placeholder={tf("league.placeholder")}
              {...register("league")}
            />
          </FieldShell>

          <FieldShell
            label={tf("message.label")}
            htmlFor="message"
            error={errors.message?.message}
            className="sm:col-span-2"
          >
            <Textarea
              id="message"
              rows={4}
              placeholder={tf("message.placeholder")}
              aria-invalid={!!errors.message}
              className="resize-none"
              {...register("message")}
            />
          </FieldShell>
        </div>

        <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">{tf("privacy")}</p>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="group h-12 gap-2 rounded-xl px-6 text-base font-semibold shadow-[0_0_36px_-10px_var(--brand-turf)]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {tf("sending")}
              </>
            ) : (
              <>
                {tf("submit")}
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </>
            )}
          </Button>
        </div>
      </form>
    </GlassCard>
  );
}
