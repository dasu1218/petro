export function validateReview(body) {
  if (!body || !Number.isInteger(body.rating) || body.rating < 1 || body.rating > 5 || typeof body.comment !== 'string' || !body.comment.trim() || body.comment.trim().length > 1000) throw Object.assign(new Error('Choose 1–5 stars and write a review of 1–1,000 characters.'), { status: 400 });
  return { rating: body.rating, comment: body.comment.trim() };
}
export function publicReview(review) {
  return { id: review._id, authorName: review.authorName, rating: review.rating, comment: review.comment, updatedAt: review.updatedAt };
}
