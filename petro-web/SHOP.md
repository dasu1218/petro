# Shop browsing

The Shop page now supports text search, category filters, from-price bounds, stock-only and active-promotion filters, price/name sorting, and six products per page. It uses the same live catalog as product details and checkout, including current promotions and remaining stock.

Filters live in the URL (`q`, `category`, `min`, `max`, `stock=1`, `offers=1`, `sort`, `page`). URLs can be shared and browser navigation restores the selected controls. Changing a filter resets pagination. Invalid query values fall back safely; out-of-range pages are clamped to the available results. A minimum price greater than the maximum shows a visible error and no results.

The displayed "From" price is the lowest product variant price. When In stock only is enabled, it is the lowest available variant price. Price filtering and sorting use this same price. Products without matching available variants are omitted. Bundle offers on the separate Bundles page keep their own pricing.

Search matches every typed word across the product name, description, category, and badges, ignoring case. Catalog order preserves the API order. Active promotions are based on the latest catalog refresh; order placement still validates final prices and availability.

All filtering is client-side over the current eight-product catalog. This is not a server-side search endpoint. Larger catalogs will need server-side filtering and pagination.

Verification: six new browsing tests cover combined filters, search, effective prices, sorting without mutating the catalog, pagination bounds, and malformed URL input. The complete suite has 87 passing tests; lint and build also pass. Responsive visual/browser verification remains.
