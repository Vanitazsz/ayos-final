import { useUsersPageController } from '../hooks/useUsersPageController';
import { UsersView } from './UsersPage.view';

const Users = () => <UsersView model={useUsersPageController()} />;
export default Users;
