import { useCategoryIdScreenController } from '../hooks/useCategoryIdScreenController';
import { CategoryView } from './CategoryIdScreen.view';

export default function CategoryScreen() {
  const model = useCategoryIdScreenController();
  return <CategoryView model={model} />;
}
