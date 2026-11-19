import { test, expect } from '@playwright/test'
import { mockStore } from './fixtures.js'
const ownReview = { id: 'saved-review', authorName: 'Customer Tester', rating: 5, comment: 'My saved review' }

test('failed review saving preserves edited comment and rating for retry', async ({ page }) => {
  const monitor = await mockStore(page, 'customer', { ownReview, failFirstReviewSave: true })
  await page.goto('/products/care-product-1')
  const reviews = page.locator('#product-reviews')
  const comment = reviews.getByRole('textbox', { name: 'Your review', exact: true })
  const rating = reviews.getByRole('combobox', { name: 'Rating', exact: true })
  await expect(comment).toHaveValue('My saved review')
  await comment.fill('My edited review to keep')
  await rating.selectOption('3')
  const save = reviews.getByRole('button', { name: 'Save review', exact: true })
  await save.click()
  await expect(reviews.getByRole('alert')).toContainText('Review could not be saved. Try again.')
  await expect(comment).toHaveValue('My edited review to keep')
  await expect(rating).toHaveValue('3')
  await expect(reviews.getByRole('button', { name: 'Reload reviews', exact: true })).toHaveCount(0)
  await save.click()
  await expect(reviews.getByText('Your review was saved.', { exact: true })).toBeVisible()
  await expect(comment).toHaveValue('My edited review to keep')
  await expect(rating).toHaveValue('3')
  expect(monitor.reviewRequests.filter((request) => request.startsWith('PUT'))).toHaveLength(2)
  expect(monitor.errors).toEqual([])
  expect(monitor.unexpected).toEqual([])
})

test('retrying failed public review loading does not overwrite the customer draft', async ({ page }) => {
  const monitor = await mockStore(page, 'customer', { ownReview })
  let allowPublicReviews = false
  await page.route('**/api/reviews/care-product-1?page=*', (route) => route.fulfill({ status: allowPublicReviews ? 200 : 503, contentType: 'application/json', body: JSON.stringify(allowPublicReviews ? { reviews: [], count: 0, rating: null, hasMore: false } : { message: 'Public reviews unavailable.' }) }))
  await page.goto('/products/care-product-1')
  const reviews = page.locator('#product-reviews')
  const comment = reviews.getByRole('textbox', { name: 'Your review', exact: true })
  await expect(reviews.getByRole('alert')).toContainText('Public reviews unavailable.')
  await expect(comment).toHaveValue('My saved review')
  await comment.fill('Keep this draft during public reload')
  await reviews.getByRole('combobox', { name: 'Rating', exact: true }).selectOption('2')
  const ownRequests = monitor.reviewRequests.filter((request) => request.endsWith('/mine')).length
  allowPublicReviews = true
  await reviews.getByRole('button', { name: 'Reload reviews', exact: true }).click()
  await expect(reviews.getByText('No reviews yet. Be the first to share your experience.', { exact: true })).toBeVisible()
  await expect(comment).toHaveValue('Keep this draft during public reload')
  await expect(reviews.getByRole('combobox', { name: 'Rating', exact: true })).toHaveValue('2')
  expect(monitor.reviewRequests.filter((request) => request.endsWith('/mine'))).toHaveLength(ownRequests)
  expect(monitor.reviewRequests.some((request) => request.startsWith('PUT'))).toBe(false)
  expect(monitor.errors).toEqual([])
  expect(monitor.unexpected).toEqual([])
})
