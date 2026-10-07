# Acme Widget Co — sales basket

A proof of concept of Acme Widget Co's sales basket in Node 24 and TypeScript.
Products come from a catalogue, delivery is charged by spend tier, and offers
take money off. Every rule is injected, so the basket itself knows none of
Acme's prices. A small JSON API serves the basket, and a React UI prices
baskets through it.

## Running it

Needs Node 24 and pnpm (`corepack enable` provides the pinned version).

```sh
pnpm install
pnpm dev         # API on :8000, UI on http://localhost:5173
pnpm test        # every package's tests
pnpm typecheck
pnpm --filter acme-widget-basket-api basket B01 B01 R01 R01 R01
```

The UI proxies `/api` to `http://localhost:8000`; set `API_URL` to point it
elsewhere, and `PORT` to move the API.

The CLI prices any basket and prints the breakdown:

```
Items:    B01, B01, R01, R01, R01
Subtotal: $114.75
Discount: -$16.48
Delivery: $0.00
Total:    $98.27
```

An unknown product code is reported on stderr with exit status 1.

There is no build step: Node 24 runs the TypeScript directly by stripping the
types, and `tsc --noEmit` checks them. `erasableSyntaxOnly` makes the compiler
reject anything Node could not strip (enums, parameter properties).

## The basket interface

The brief leaves the format of the catalogue, delivery rules and offers open.
Here they are one `PricingRules` object passed to the constructor:

```ts
const basket = new Basket({
  catalogue: new InMemoryCatalogue([
    { code: 'R01', name: 'Red Widget', price: Money.cents(3295) },
    { code: 'G01', name: 'Green Widget', price: Money.cents(2495) },
    { code: 'B01', name: 'Blue Widget', price: Money.cents(795) },
  ]),
  delivery: new TieredDeliveryCharge([
    { below: Money.cents(5000), charge: Money.cents(495) },
    { below: Money.cents(9000), charge: Money.cents(295) },
  ]),
  offers: [new BuyOneGetSecondHalfPrice('R01')],
});

basket.add('R01');
basket.add('R01');
basket.total().format(); // "$54.37"
```

This is exactly what `acmeBasket()` builds. Amounts are integer cents, so
`Money.cents(3295)` is $32.95.

## How it works

```
api/
├── bin/basket.ts                CLI
└── src/
    ├── main.ts                  process entry: logger, port, shutdown
    ├── http/                    HttpApi (routes as a plain function), node:http adapter
    ├── basket.ts                Basket: add(), total(), quote(); PricingRules
    ├── money.ts                 integer cents
    ├── acme-widget-co.ts        Acme's products and rules, wired in one place
    ├── catalogue/               Catalogue, InMemoryCatalogue, Product, UnknownProduct
    ├── delivery/                DeliveryChargeRule, TieredDeliveryCharge
    └── offer/                   Offer, BuyOneGetSecondHalfPrice
web/                             React UI (Vite, Vitest); every amount comes from the API
```

Tests sit next to the code they test (`*.test.ts`) and run on `node:test`
in the API and Vitest in the UI.

- **`Basket`** depends on three abstractions: a `Catalogue` to look products
  up, a `DeliveryChargeRule` to price delivery, and any number of `Offer`s.
  `add(code)` looks the product up before storing it, so a bad code throws
  `UnknownProduct` and leaves the basket untouched. `total()` returns the
  amount due; `quote()` returns the full breakdown.
- **`TieredDeliveryCharge`** takes `{ below, charge }` tiers in any order. The
  lowest threshold the amount is under sets the charge; at or above every
  threshold, delivery is free. `nextStep()` says how much more spend reaches a
  cheaper charge.
- **`BuyOneGetSecondHalfPrice`** is parameterised by product code, so the same
  class covers the offer on any product. Every offer can `describe()` itself,
  so a client can show it without knowing its class.

`Basket.quote()` prices in this order:

1. subtotal = sum of item prices
2. discount = sum of every offer's discount, capped at the subtotal
3. delivery = delivery rule applied to subtotal − discount
4. total = subtotal − discount + delivery

## HTTP API

Amounts are integer cents. Errors are `{ "error": { "code", "message" } }`.

| Request | Response |
| --- | --- |
| `GET /api/catalogue` | products, delivery tiers and offers (each offer describes itself) |
| `POST /api/quote` `{ "codes": ["R01", "R01"] }` | `subtotal`, `discount`, `delivery`, `total` and `nextTier`, the spend that reaches cheaper delivery |

An unknown code is 422 `unknown_product`; malformed JSON or non-string codes
are 400; more than 200 codes or a body over 8 KB is 413; a wrong method is 405
with `Allow`. `HttpApi.handle()` is a plain function of method, path and body,
so routes are tested without a server; `server.ts` only adapts `node:http` to
it, caps the body, sets timeouts and turns an unexpected error into a logged
500 that does not leak its message. Request bodies are validated with zod and
logs are structured (pino); those two are the API's only runtime dependencies.

## The UI

`web/` is a single screen: pick quantities or load one of the brief's example
baskets, and the quote (subtotal, offer, delivery, total) updates from
`POST /api/quote`. A meter shows how far the basket is from cheaper delivery.
The UI holds no prices of its own; responses are checked with zod, and a
stopped API shows a retry message instead of stale totals.

## Design decisions

- **Strategies for delivery and offers.** Acme is "experimenting with special
  offers", so offers and delivery rules are interfaces. A new offer is a new
  class in the `offers` list; `Basket` does not change.
- **Integer cents, never floats.** `0.1 + 0.2` is not `0.3` in floating point.
  `Money` holds whole cents and refuses negative or fractional amounts, so a
  pricing bug fails loudly instead of producing a wrong total.
- **One composition root.** `acme-widget-co.ts` is the only place that knows
  Acme's prices and rules. `Basket` is tested against stub rules; the
  acceptance test uses the real wiring.
- **Platform over packages.** `node:test`, Node's type stripping and `tsc` for
  type checking. TypeScript and `@types/node` are the only dependencies of the
  basket, both for development.

## Assumptions

- **Half price rounds down to the cent.** The second red widget costs
  `floor(3295 / 2) = 1647` cents, a discount of 1648. This matches $54.37 and
  $98.27 in the brief; rounding half up would give $54.38 and $98.28.
- **Delivery is charged after offers.** R01, R01 is $65.90 before the discount
  and $49.42 after. $54.37 only works if the under-$50 tier applies, that is,
  on the discounted amount.
- **The offer repeats per pair.** Every second red widget is half price, so
  four red widgets get two discounts. The brief's examples only go up to three.
- **An empty basket costs $4.95.** Read literally, a $0 order is under $50. It
  could reasonably be $0 instead; that would be a guard in `Basket.quote()`.
- **Prices are US dollars**, and items are added one at a time through
  `add(code)`, as in the brief.

## Tests

Each rule is tested on its own at its boundaries (delivery at $49.99, $50.00,
$89.99 and $90.00; zero to four red widgets), `Basket` is tested against stub
rules, and `acme-widget-co.test.ts` checks the four example baskets from the
brief:

| Products                | Total  |
| ----------------------- | ------ |
| B01, G01                | $37.85 |
| R01, R01                | $54.37 |
| R01, G01                | $60.85 |
| B01, B01, R01, R01, R01 | $98.27 |
