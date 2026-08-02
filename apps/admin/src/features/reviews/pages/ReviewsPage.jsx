import { useReviewsPageController } from '../hooks/useReviewsPageController';
import { ReviewsView } from './ReviewsPage.view';

const Reviews = () => <ReviewsView model={useReviewsPageController()} />;
export default Reviews;
