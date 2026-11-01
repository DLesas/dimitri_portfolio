/**
 * DNS for lesas.dev, hosted on Cloudflare (imported as the records were set up in the
 * dashboard): the site on Vercel, and the records that let SES send as lesas.dev
 * (email.ts).
 *
 * Each record carries the id Cloudflare gave it, so the first `pulumi up` adopts the
 * existing record instead of creating a duplicate; after that the id does nothing.
 */
import * as pulumi from "@pulumi/pulumi";
import * as cloudflare from "@pulumi/cloudflare";
import { cloudflareZoneId as zoneId } from "./config";
import { dkimTokens } from "./email";

type RecordArgs = Omit<cloudflare.DnsRecordArgs, "zoneId" | "ttl">;

function record(name: string, recordId: string, args: RecordArgs) {
  return new cloudflare.DnsRecord(
    name,
    // TTL 1 is Cloudflare's "automatic"
    { zoneId, ttl: 1, ...args },
    { protect: true, import: `${zoneId}/${recordId}` }
  );
}

// ---- The site (Vercel) ----

record("apex", "1b39b6bae564cddeccc0be73aa076826", {
  name: "lesas.dev",
  type: "A",
  content: "216.198.79.1",
  proxied: false,
  comment: "Vercel A record for root url",
});
// Proxied through Cloudflare; Vercel redirects it to the apex (site.ts)
record("www", "2239bb8cf80e681918bf8f040d0ddfdf", {
  name: "www.lesas.dev",
  type: "CNAME",
  content: "4124c13de433a109.vercel-dns-017.com",
  proxied: true,
  comment: "vercel deployment",
});
// Left from an earlier setup: Cloudflare answers NS queries for its zones with its own
// nameservers, so these two are never served
record("vercel-ns-1", "0d77f083fcc74e1997a84d390fe72568", {
  name: "lesas.dev",
  type: "NS",
  content: "ns1.vercel-dns.com",
  proxied: false,
  comment: "Vercel nameservers",
});
record("vercel-ns-2", "bfb56753ccb769432fa574292a2728cc", {
  name: "lesas.dev",
  type: "NS",
  content: "ns2.vercel-dns.com",
  proxied: false,
  comment: "Vercel nameserver",
});

// ---- Email (SES) ----

// DKIM: SES signs with three keys, each published under its token. The records follow
// the identity's tokens, so they stay right if SES ever changes them. The ids are in the
// order SES lists the tokens.
const DKIM_RECORD_IDS = [
  "306c9c86ff61f81261478a3c9a2b157f",
  "613b624291493f5a9236687896a900cb",
  "5b9f6dedfa70cbddcdd757f9694fb8f6",
];
DKIM_RECORD_IDS.forEach((recordId, i) => {
  const token = dkimTokens.apply((tokens) => tokens[i]);
  record(`dkim-${i + 1}`, recordId, {
    name: pulumi.interpolate`${token}._domainkey.lesas.dev`,
    type: "CNAME",
    content: pulumi.interpolate`${token}.dkim.amazonses.com`,
    proxied: false,
    comment: "AWS SES",
  });
});

const SPF = '"v=spf1 include:amazonses.com ~all"';
record("spf", "652b961441cdbd437aa8678a3d096598", {
  name: "lesas.dev",
  type: "TXT",
  content: SPF,
  proxied: false,
  comment: "AWS SES",
});
record("dmarc", "b837616dd6b670d712976c6724f72dd9", {
  name: "_dmarc.lesas.dev",
  type: "TXT",
  content: '"v=DMARC1; p=none;"',
  proxied: false,
  comment: "AWS SES",
});

// The MAIL FROM domain (email.ts): bounces come back here, and SPF passes for it
record("mail-mx", "06052116c8d53a16e08189eb97ad95b5", {
  name: "mail.lesas.dev",
  type: "MX",
  content: "feedback-smtp.eu-west-2.amazonses.com",
  priority: 10,
  proxied: false,
  comment: "AWS SES",
});
record("mail-spf", "bd03b5ed9441bca12212c7e13d77bc41", {
  name: "mail.lesas.dev",
  type: "TXT",
  content: SPF,
  proxied: false,
  comment: "AWS SES",
});
