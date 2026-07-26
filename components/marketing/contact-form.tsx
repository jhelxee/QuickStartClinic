"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";

import { submitInquiry } from "@/app/actions/contact";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { contactSchema, type ContactValues } from "@/lib/validation";

export function ContactForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ContactValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: "", email: "", phone: "", message: "" },
  });

  async function onSubmit(values: ContactValues) {
    setIsSubmitting(true);
    const result = await submitInquiry(values);
    setIsSubmitting(false);

    if (result.error) {
      toast.error("We couldn't send your message", { description: result.error });
      return;
    }

    toast.success("Message sent", {
      description: "Our care coordination team will get back to you soon.",
    });
    form.reset();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="contact-name">Name</FormLabel>
                <FormControl>
                  <Input
                    id="contact-name"
                    autoComplete="name"
                    placeholder="Your name"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="contact-email">Email</FormLabel>
                <FormControl>
                  <Input
                    id="contact-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="contact-phone">Phone (optional)</FormLabel>
              <FormControl>
                <Input
                  id="contact-phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="(555) 123-4567"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="contact-message">Message</FormLabel>
              <FormControl>
                <Textarea
                  id="contact-message"
                  rows={4}
                  placeholder="What can we help with?"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isSubmitting} className="self-start">
          {isSubmitting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Sending&hellip;
            </>
          ) : (
            <>
              <Send className="size-4" />
              Send Message
            </>
          )}
        </Button>
      </form>
    </Form>
  );
}
