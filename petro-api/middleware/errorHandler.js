// Express 5 forwards rejected promises from async handlers here automatically.
export const errorHandler = (error, _request, response, _next) => {
  if (error.name === 'ValidationError') {
    const message = Object.values(error.errors).map((item) => item.message).join(', ');
    return response.status(400).json({ message });
  }

  if (error.code === 11000) {
    return response.status(409).json({ message: 'An account with this email already exists' });
  }

  console.error(error);
  return response.status(error.status || 500).json({
    message: error.message || 'Something went wrong',
  });
};

export default errorHandler;
