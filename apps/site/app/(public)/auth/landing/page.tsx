import { Building2, Plus, Mail } from 'lucide-react';
import { AddOrganizationBtn } from '@/components/organization/AddOrganizationBtn';
import { OrganizationCard } from '@/components/organization/OrganizationCard';
import { Divider } from 'antd';
import { UserInvitations } from '@/components/organization/UserInvitations';

export default async function LandingPage() {
  return (
    <div className="container mx-auto px-4 py-8 md:px-6 md:py-12 max-w-4xl">
      {/* Header Section */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
          <Building2 className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold mb-3 text-foreground">
          Organizations
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Add or join an organization to start collaborating with your team
        </p>
      </div>

      {/* Main Content */}
      <div className="space-y-6">
        <OrganizationCard
          icon={<Plus className="w-5 h-5 text-primary" />}
          iconBg="bg-primary/10"
          title="Add a new organization"
          description="Set up a new organization to start collaborating with your team"
          action={<AddOrganizationBtn />}
        />

        <Divider>OR</Divider>

        <OrganizationCard
          icon={<Mail className="w-5 h-5 text-accent-foreground" />}
          iconBg="bg-accent"
          title="View Pending Invitations"
          description="Please find an organizer to invite you, and then accept the invitations to join organizations"
        >
          <UserInvitations />
        </OrganizationCard>
      </div>
    </div>
  );
}
