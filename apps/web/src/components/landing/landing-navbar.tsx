"use client";

import { Navbar } from "@heroui-pro/react";
import { buttonVariants } from "@heroui/styles";
import NextLink from "next/link";

import { brand } from "../../i18n/id/brand";
import { LANDING_SECTIONS, landingNav as t } from "../../i18n/id/landing";
import { SurauMark } from "../shell/logo";

// Navbar landing page (/): merek, jangkar ke bagian halaman, dan tombol ke Beranda (/home). Di ponsel
// jangkar pindah ke menu Navbar.Menu; tombol "Buka Surau" tetap terlihat.
export function LandingNavbar() {
  return (
    <Navbar aria-label={t.label} className="border-separator border-b" maxWidth="xl">
      <Navbar.Header>
        <Navbar.MenuToggle className="md:hidden" srLabel={t.menu} />
        <Navbar.Brand>
          <NextLink
            aria-label={t.home}
            className="focus-visible:ring-focus flex items-center gap-2 rounded-lg outline-none focus-visible:ring-2"
            href="/"
          >
            <SurauMark className="size-7 shrink-0" />
            <span aria-hidden="true" className="text-foreground text-xl font-bold">
              {brand.name}
            </span>
          </NextLink>
        </Navbar.Brand>
        <Navbar.Spacer />
        <Navbar.Content className="hidden md:flex">
          {LANDING_SECTIONS.map((id) => (
            <Navbar.Item key={id} href={`#${id}`}>
              {t.sections[id]}
            </Navbar.Item>
          ))}
        </Navbar.Content>
        <Navbar.Spacer className="hidden md:block" />
        <Navbar.Content>
          <NextLink className={buttonVariants({ size: "sm" })} href="/home">
            {t.open}
          </NextLink>
        </Navbar.Content>
      </Navbar.Header>
      <Navbar.Menu>
        {LANDING_SECTIONS.map((id) => (
          <Navbar.MenuItem key={id} href={`#${id}`}>
            {t.sections[id]}
          </Navbar.MenuItem>
        ))}
      </Navbar.Menu>
    </Navbar>
  );
}
