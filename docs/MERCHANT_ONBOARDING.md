# Merchant Onboarding Runbook

**Status:** active, written 2026-11-04. Companion to [`ACTIVATION_PLAN.md`](./ACTIVATION_PLAN.md).

Written because the first five merchants all abandoned setup. Four of five uploaded **one product or none**, and not one entered a single order. Self-serve onboarding has a 0% activation rate so far, so this runbook assumes the opposite approach: **you do the work with them, in one sitting, in person or on a call.**

---

## 1. The principle

> A merchant does not abandon because the software is hard. They abandon because setup is **all cost and no payoff** — an hour of typing before anything good happens. Our job is to pay that cost for them and get them to the payoff on day one.

Three rules follow:

1. **Never send a merchant away to "set up their shop."** That is the step everyone has quit at.
2. **A shop is not live until it is stocked.** One product is not a shop. The bar is in §4.
3. **The session ends with the link already sent to real customers**, not with "I'll share it later." Unsent links are how a stocked shop still earns nothing.

This is deliberately unscalable. That is correct for the first 5–10 merchants: the point is to learn exactly where people stall, which only happens if you are watching.

## 2. Before the session — the prep list

Send this 2–3 days ahead. Gathering photos and prices is the slow part; doing it live wastes the session.

> **Copy-paste message:**
>
> Hi [name] — looking forward to setting up your shop on [date]. So we can finish in one sitting, could you get these ready beforehand?
>
> 1. **Photos** of your 10–15 best-selling items — phone photos are fine, just make sure the item is clear and the background isn't cluttered.
> 2. For each item: **what you sell it for**, and **what it costs you** (this stays private — it's only so the app can show you your actual profit).
> 3. **How many you have in stock** right now for each.
> 4. If an item comes in sizes or colours, the list of those.
> 5. Your **business logo** if you have one (no problem if not).
> 6. The **MoMo number or bank account** you want to be paid into.
>
> Don't worry about typing anything in — I'll do all of that with you on the day.

**Why cost price matters enough to ask for:** profit reporting, the margin hints, and the analytics "Profit 12 months" figure are all dead without it. A merchant who skips it sees "Cost unknown" on every order and a profit KPI covering 0% of sales — one of the most compelling things the product does, invisible. Collect it at setup or it never gets filled in.

## 3. The session (target: 2 hours)

| Step | What you do | Watch for |
| --- | --- | --- |
| 1. Account + shop identity | Sign up, business name, subdomain, short description, shop colour, logo | Subdomain is permanent in practice — read it aloud and confirm before saving |
| 2. Payout details | Bank or MoMo, via the onboarding form | Confirm the number is theirs and active; a wrong payout detail surfaces only at the first real sale |
| 3. Catalogue — **you type** | Enter 10–15 products with photo, category, price, cost price, stock count, low-stock threshold, and variants where they apply | Keep narrating what you're doing so they learn it by watching |
| 4. Set low-stock thresholds | A sensible number per variant (not zero) | Alerts never fire if this is left at default and nothing is below it |
| 5. Tour the dashboard | Overview, Orders, Products, Customers, Analytics, Shop settings — 5 minutes, no more | Don't teach every feature; teach the two they'll use daily |
| 6. Enter one real past order together | Use a genuine recent WhatsApp or walk-in sale. Mark it paid | This is the one that makes order tracking concrete. Do not skip it |
| 7. Show the shop on *their* phone | Open the live link on their own device | Their reaction here tells you whether they'll actually share it |
| 8. **Send the link, now** | Watch them paste it into WhatsApp status / a broadcast / their best customers | If they say "I'll do it later," that usually means never. Do it in the room |
| 9. Agree the two tallies | Explain the pay-on-delivery and failed-delivery tallies (§6) and how to send them | Keep it to a WhatsApp message per order — anything heavier gets dropped |
| 10. Set the follow-up | Agree you'll check in tomorrow, then weekly | Put it in your calendar before you leave |

## 4. Definition of "activated"

A merchant is **not** onboarded until all of these are true. Track it per merchant.

- [ ] Storefront live and active
- [ ] **≥ 10 products**, each with at least one photo
- [ ] Every variant has: price, **cost price**, stock count, low-stock threshold
- [ ] Payout details saved
- [ ] Shop link sent to **≥ 20 real customers** (status post, broadcast, or individual chats)
- [ ] **≥ 1 order recorded** in the system (manual entry counts)
- [ ] Merchant has opened the dashboard at least once on their own, unprompted

Anything less is a lead, not a merchant. Do not count it in any adoption number.

## 5. Follow-up cadence

The first fortnight decides whether this sticks. Each check-in has one specific ask — not "how's it going?"

| When | Ask | If the answer is bad |
| --- | --- | --- |
| **Day 1** | "Did anyone message you about the link?" | If no one saw it, help them post to status properly — reach, not just sending |
| **Day 3** | "Has anyone ordered? Did you add it to the app?" | If they took an order and didn't record it, that is the key failure — sit with them and enter it |
| **Day 7** | "Can I see your orders page?" Check live | Zero orders → distribution problem (gate G1). Orders not recorded → pull problem (gate G5) |
| **Day 14** | "What's annoying about it so far?" Ask for one thing to fix | Vague praise means they aren't using it. Press for specifics |
| **Day 30** | Review their Analytics page **with them** — revenue, profit, best sellers | This is the payoff moment. If the data is thin because they haven't recorded orders, that is your answer about the product |

Log every check-in. The qualitative notes matter more than the metrics at this sample size.

## 6. The two tallies

Every pilot merchant is asked for exactly two numbers. This is the entire measurement programme — keep it this small or it will not happen.

**Tally 1 — how customers paid.** Per order: *prepaid* or *paid on delivery*.
**Tally 2 — how deliveries ended.** Per delivery: *completed*, *refused*, or *no-show*.

A WhatsApp message per order is enough (`"order 3 — pay on delivery, completed"`). Target 30 of each before drawing conclusions. These feed gates G2, G3, G6 and G7 in the activation plan, and they decide whether the next big build is WhatsApp notifications or a buyer-reputation layer.

## 7. Churn signals and what to do

| Signal | What it usually means | Intervention |
| --- | --- | --- |
| Hasn't opened the dashboard in 7 days | No reason to — nothing is happening there | Ask what they sold this week and record it together. One live order makes the dashboard worth opening |
| Took orders but recorded none | The app is extra work, not a tool | Watch how they currently track orders. If the notebook is faster, we have a product problem, not a training problem |
| Stock numbers have drifted from reality | They sold without recording | Recount together once. If it drifts again, inventory tracking isn't landing |
| Never sent the link beyond the first post | Embarrassed by the shop, or unsure what to say | Look at it with fresh eyes — thin catalogue, bad photos, wrong colour? Write the message for them |
| Asks "can I just take MoMo directly?" | Correct instinct on their part; a real signal about the fee model | Say yes, record the order as manual. Note it — it is direct evidence for the pricing decision in `ACTIVATION_PLAN.md` §6 |
| Goes quiet after a failed delivery | They lost money and associate it with the new system | Call. This is exactly the pain the reputation layer would address — capture the story in detail |

## 8. What we say about price during the pilot

Pilot merchants pay **nothing**, and that is stated plainly with an end in sight:

> "While we're building this together you won't pay anything. In exchange I'd like your honest feedback, and those two tallies. When we do start charging I'll tell you well in advance, and you'll get a say in what's fair."

Do **not** promise free forever, and do not quote a future price before the gates in the activation plan have landed. If a merchant asks what it will cost, it is fine to say the current storefront fee is 3% of a storefront sale (which already covers payment processing — they would pay Paystack roughly 2% on their own anyway), and that a flat monthly option is being considered. Then ask which they would prefer and why. That answer is worth more than the reassurance.

## 9. When to stop doing it this way

This runbook is deliberately manual. Move to a self-serve flow only once:

- 3+ merchants have hit the §4 activation bar, **and**
- you can name the two or three steps everyone stalls on, **and**
- those steps have been fixed in the product (bulk product entry, catalogue import, guided setup, or whatever the evidence points to)

Until then, every self-serve signup is a merchant we will probably lose — so the right move is to intercept them personally.
