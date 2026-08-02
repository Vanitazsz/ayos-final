import { useAuditLogsPageController } from '../hooks/useAuditLogsPageController';
import { AuditLogsView } from './AuditLogsPage.view';

const AuditLogs = () => <AuditLogsView model={useAuditLogsPageController()} />;
export default AuditLogs;
