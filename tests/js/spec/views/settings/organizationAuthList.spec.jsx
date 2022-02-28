import {enzymeRender} from 'sentry-test/enzyme';

import OrganizationAuthList from 'sentry/views/settings/organizationAuth/organizationAuthList';

describe('OrganizationAuthList', function () {
  it('renders with no providers', function () {
    const wrapper = enzymeRender(<OrganizationAuthList providerList={[]} />);

    expect(wrapper).toSnapshot();
  });

  it('renders', function () {
    const wrapper = enzymeRender(
      <OrganizationAuthList
        orgId="org-slug"
        onSendReminders={() => {}}
        providerList={TestStubs.AuthProviders()}
      />
    );

    expect(wrapper).toSnapshot();
  });

  it('renders for members', function () {
    const wrapper = enzymeRender(
      <OrganizationAuthList
        orgId="org-slug"
        onSendReminders={() => {}}
        providerList={TestStubs.AuthProviders()}
        activeProvider={TestStubs.AuthProviders()[0]}
      />,
      TestStubs.routerContext([
        {
          organization: TestStubs.Organization({access: ['org:read']}),
        },
      ])
    );

    expect(wrapper.find('ProviderItem ActiveIndicator')).toHaveLength(1);
  });

  describe('with 2fa warning', function () {
    const require2fa = {require2FA: true};
    const withSSO = {features: ['sso-basic']};
    const withSAML = {features: ['sso-saml2']};

    it('renders', function () {
      const context = TestStubs.routerContext([
        {organization: TestStubs.Organization({...require2fa, ...withSSO})},
      ]);

      const wrapper = enzymeRender(
        <OrganizationAuthList
          orgId="org-slug"
          onSendReminders={() => {}}
          providerList={TestStubs.AuthProviders()}
        />,
        context
      );

      expect(wrapper.find('PanelAlert[type="warning"]').exists()).toBe(true);
    });

    it('renders with saml available', function () {
      const context = TestStubs.routerContext([
        {organization: TestStubs.Organization({...require2fa, ...withSAML})},
      ]);

      const wrapper = enzymeRender(
        <OrganizationAuthList
          orgId="org-slug"
          onSendReminders={() => {}}
          providerList={TestStubs.AuthProviders()}
        />,
        context
      );

      expect(wrapper.find('PanelAlert[type="warning"]').exists()).toBe(true);
    });

    it('does not render without sso available', function () {
      const context = TestStubs.routerContext([
        {organization: TestStubs.Organization({...require2fa})},
      ]);

      const wrapper = enzymeRender(
        <OrganizationAuthList
          orgId="org-slug"
          onSendReminders={() => {}}
          providerList={TestStubs.AuthProviders()}
        />,
        context
      );

      expect(wrapper.find('PanelAlert[type="warning"]').exists()).toBe(false);
    });

    it('does not render with sso and require 2fa disabled', function () {
      const context = TestStubs.routerContext([
        {organization: TestStubs.Organization({...withSSO})},
      ]);

      const wrapper = enzymeRender(
        <OrganizationAuthList
          orgId="org-slug"
          onSendReminders={() => {}}
          providerList={TestStubs.AuthProviders()}
        />,
        context
      );

      expect(wrapper.find('PanelAlert[type="warning"]').exists()).toBe(false);
    });

    it('does not render with saml and require 2fa disabled', function () {
      const context = TestStubs.routerContext([
        {organization: TestStubs.Organization({...withSAML})},
      ]);

      const wrapper = enzymeRender(
        <OrganizationAuthList
          orgId="org-slug"
          onSendReminders={() => {}}
          providerList={TestStubs.AuthProviders()}
        />,
        context
      );

      expect(wrapper.find('PanelAlert[type="warning"]').exists()).toBe(false);
    });
  });
});
