const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MARKER = '# injected by withIosPodDeploymentTarget';
const DEPLOYMENT_TARGET = '15.1';
const POST_INSTALL_ANCHOR = 'post_install do |installer|';

const POST_INSTALL_LOOP = `
    ${MARKER}
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '${DEPLOYMENT_TARGET}'
      end
    end
`;

module.exports = function withIosPodDeploymentTarget(config) {
  return withDangerousMod(config, [
    'ios',
    (cfg) => {
      const podfilePath = path.join(
        cfg.modRequest.platformProjectRoot,
        'Podfile',
      );
      if (!fs.existsSync(podfilePath)) {
        return cfg;
      }
      let contents = fs.readFileSync(podfilePath, 'utf8');
      if (contents.includes(MARKER) || !contents.includes(POST_INSTALL_ANCHOR)) {
        return cfg;
      }
      contents = contents.replace(
        POST_INSTALL_ANCHOR,
        `${POST_INSTALL_ANCHOR}${POST_INSTALL_LOOP}`,
      );
      fs.writeFileSync(podfilePath, contents);
      return cfg;
    },
  ]);
};
