import React from 'react';
import { useReviewController } from './useReviewController';
import { ReviewView } from './ReviewView';

export default function ReviewScreen() {
  const controller = useReviewController();
  return <ReviewView {...controller} />;
}
