import { useProfilePageController } from '../hooks/useProfilePageController';
import { ProfileView } from './ProfilePage.view';

const Profile = () => <ProfileView model={useProfilePageController()} />;
export default Profile;
