import { useLoginPageController } from '../hooks/useLoginPageController';
import { LoginView } from './LoginPage.view';

const Login = () => <LoginView model={useLoginPageController()} />;
export default Login;
