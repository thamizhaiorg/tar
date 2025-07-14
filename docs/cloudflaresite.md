
# Setting Up a Custom Domain for Your Storefront (Cloudflare Pages)

This guide explains how users can serve their store (e.g., `https://tarapp.com/store/acme-123`) on their own custom domain (e.g., `https://acmestore.com`) using Cloudflare Pages.

---

## Subdomain Support for Each Store

You can also serve each store on its own subdomain, such as `https://acmestore.tarapp.com` or `https://store123.tarapp.com`. This is achieved by configuring a wildcard DNS record (`*.tarapp.com`) to point to your Cloudflare Pages deployment. Your app will use the subdomain (e.g., `acmestore`) to load the correct store data. This approach easily scales to millions of stores, with no extra infrastructure per user.

For custom domains, users can set up a CNAME pointing to their assigned subdomain (e.g., `www.acmestore.com` CNAME → `acmestore.tarapp.com`).

---

## Step 1: Add Your Custom Domain in the Dashboard

1. Go to your store’s settings in the dashboard.
2. Find the “Custom Domain” section.
3. Enter your domain (e.g., `acmestore.com`) and click “Add Domain”.

---

## Step 2: Update Your DNS Records

Depending on your domain setup, add the following DNS records at your domain registrar:

- **For subdomains (recommended, e.g., `www.acmestore.com`):**
  - Add a CNAME record:
    ```
    Type:   CNAME
    Name:   www
    Value:  tarapp.com
    ```
- **For root domains (e.g., `acmestore.com`):**
  - Add an A record (Cloudflare will provide the IP address) or use CNAME flattening if supported:
    ```
    Type:   A
    Name:   @
    Value:  <Cloudflare Pages IP>
    ```
  - Or, if your registrar supports it, use:
    ```
    Type:   CNAME
    Name:   @
    Value:  tarapp.com
    ```

- **(Optional) For domain verification:**
  - Add a TXT record if instructed by the dashboard.

---

## Step 3: Cloudflare Pages Domain Setup

- The platform will automatically add your domain to the Cloudflare Pages project.
- Cloudflare will:
  - Check your DNS records.
  - Provision a free SSL certificate.
  - Route all traffic for your domain to your storefront.

---

## Step 4: Wait for Propagation

- DNS changes can take a few minutes to a few hours.
- Once active, your store will be live at `https://acmestore.com` (or your chosen domain).

---

## Example

Suppose your store is at `https://tarapp.com/store/acme-123` and you want to use `www.acmestore.com`:

1. Add `www.acmestore.com` in your dashboard.
2. At your domain registrar, add:
    ```
    Type:   CNAME
    Name:   www
    Value:  tarapp.com
    ```
3. Wait for DNS to propagate.
4. Visit `https://www.acmestore.com` — your store is now live!

---

## Notes

- Both `https://tarapp.com/store/acme-123` and `https://acmestore.com` will show the same store.
- You can remove or change your custom domain anytime in the dashboard.
- For troubleshooting, ensure your DNS records are correct and fully propagated.
