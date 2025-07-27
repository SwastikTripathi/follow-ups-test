
'use client';

import React, { useEffect, useState } from 'react';
import { notFound, useParams } from 'next/navigation';
import { getPublicProfileBySlug } from './actions';
import type { ResumeData } from '@/lib/types';
import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Loader2, Mail, Phone, MapPin, Linkedin, Twitter, Instagram, Globe, Briefcase, GraduationCap, Star, Award, Lightbulb, UserCircle, Search, Home, ArrowRight, Link2 } from 'lucide-react';
import { format } from 'date-fns';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

const UserNotFound = () => (
  <div className="flex flex-col min-h-screen">
    <PublicNavbar />
    <main className="flex-1 py-12 md:py-16 flex justify-center items-center">
        <Card className="w-full max-w-lg text-center shadow-xl">
            <CardHeader>
                <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit">
                    <Search className="h-10 w-10 text-primary" />
                </div>
                <CardTitle className="font-headline text-2xl mt-4">Profile Not Found</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                    Sorry, we couldn’t find the profile you were looking for. The link may be incorrect, or the user may have made their profile private.
                </p>
                <div className="flex justify-center gap-4 pt-4">
                    <Button asChild>
                        <Link href="/"><Home className="mr-2 h-4 w-4"/> Go to Homepage</Link>
                    </Button>
                    <Button variant="outline" asChild>
                         <Link href="/auth?action=signup">Create Your Profile <ArrowRight className="ml-2 h-4 w-4"/></Link>
                    </Button>
                </div>
            </CardContent>
        </Card>
    </main>
    <PublicFooter />
  </div>
);


export default function PublicProfilePage() {
  const params = useParams();
  const slug = params?.slug?.toString().toLowerCase() as string;
  const [profileData, setProfileData] = useState<{ fullName: string | null; resume: ResumeData | null; } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enlargedImageUrl, setEnlargedImageUrl] = React.useState<string | null>(null);

  useEffect(() => {
    if (!slug) {
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getPublicProfileBySlug(slug.toLowerCase());
        setProfileData(data); // Set data, which could be null
      } catch (err: any) {
        setError(err.message || 'Failed to load profile.');
        setProfileData(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [slug]);

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <PublicNavbar />
        <main className="flex-1 py-12 md:py-16 flex justify-center items-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </main>
      </div>
    );
  }

  if (error || !profileData) {
    return <UserNotFound />;
  }
  
  const { fullName, resume } = profileData;
  const { contactInfo, socials, experiences, education, skills, projects, certificates } = resume || {};
  const userInitials = fullName ? fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U';
  
  const convertGoogleDriveUrl = (url: string): string => {
      if (typeof url !== 'string' || !url) return '';
      if (url.includes('drive.google.com/file/d/')) {
        const fileIdMatch = url.match(/file\/d\/([a-zA-Z0-9_-]+)/);
        if (fileIdMatch && fileIdMatch[1]) {
          return `https://drive.google.com/uc?export=view&id=${fileIdMatch[1]}`;
        }
      }
      return url;
  };
  
  // const finalProfileImageUrl = profileImageUrl ? convertGoogleDriveUrl(profileImageUrl) : undefined;

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-background to-secondary/10">
      <PublicNavbar />
      <main className="flex-1 py-12 md:py-16">
        <div className="w-[90%] max-w-6xl mx-auto">
          {/* Header */}
          <header className="flex flex-col sm:flex-row items-center gap-6 mb-12">
            <Avatar className="h-24 w-24 sm:h-32 sm:w-32 border-4 border-primary shadow-lg">
              {/* <AvatarImage src={finalProfileImageUrl} alt={contactInfo?.name} /> */}
              <AvatarFallback className="text-4xl bg-muted">{userInitials}</AvatarFallback>
            </Avatar>
            <div className="text-center sm:text-left">
              <h1 className="text-3xl sm:text-4xl font-bold font-headline text-foreground">{contactInfo?.name}</h1>
              <p className="text-lg text-muted-foreground">{contactInfo?.location}</p>
              <div className="flex items-center justify-center sm:justify-start gap-3 text-sm text-muted-foreground mt-2">
                {contactInfo?.email && <a href={`mailto:${contactInfo.email}`} className="flex items-center hover:text-primary"><Mail className="mr-1.5 h-4 w-4" /> {contactInfo.email}</a>}
                {contactInfo?.phone && <span className="flex items-center"><Phone className="mr-1.5 h-4 w-4" /> {contactInfo.phone}</span>}
              </div>
              <div className="flex items-center justify-center sm:justify-start gap-4 mt-3">
                {socials?.linkedin && <a href={socials.linkedin} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary"><Linkedin /></a>}
                {socials?.twitter && <a href={socials.twitter} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary"><Twitter /></a>}
                {socials?.instagram && <a href={socials.instagram} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary"><Instagram /></a>}
                {socials?.otherLinks?.map((link, i) => <a key={i} href={link} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary"><Globe /></a>)}
              </div>
            </div>
          </header>

          <div className="space-y-12">
            {/* Summary */}
            {contactInfo?.summary && (
              <section>
                <h2 className="text-2xl font-headline font-bold mb-4 flex items-center"><UserCircle className="mr-3 h-6 w-6 text-primary"/>Professional Summary</h2>
                <p className="text-muted-foreground whitespace-pre-line">{contactInfo.summary}</p>
                <Separator className="mt-8" />
              </section>
            )}

            {/* Experience */}
            {experiences && experiences.length > 0 && (
              <section>
                <h2 className="text-2xl font-headline font-bold mb-6 flex items-center"><Briefcase className="mr-3 h-6 w-6 text-primary"/> Work Experience</h2>
                <div className="space-y-6">
                  {experiences.map(exp => (
                    <div key={exp.id}>
                      <h3 className="font-semibold text-lg text-foreground">{exp.role}</h3>
                      <p className="font-medium text-accent">{exp.company}</p>
                      <p className="text-sm text-muted-foreground mb-2">
                        {exp.startDate ? format(new Date(exp.startDate), 'MMM yyyy') : 'N/A'} - {exp.isCurrent ? 'Present' : exp.endDate ? format(new Date(exp.endDate), 'MMM yyyy') : 'N/A'}
                      </p>
                      <p className="text-sm text-muted-foreground whitespace-pre-line">{exp.description}</p>
                    </div>
                  ))}
                </div>
                 <Separator className="mt-8" />
              </section>
            )}
            
            {/* Skills */}
            {skills && skills.length > 0 && (
              <section>
                <h2 className="text-2xl font-headline font-bold mb-6 flex items-center"><Star className="mr-3 h-6 w-6 text-primary"/> Skills</h2>
                <div className="flex flex-wrap gap-2">
                  {skills.map(skill => (
                    <div key={skill} className="bg-primary/10 text-primary font-medium px-3 py-1 rounded-full text-sm">{skill}</div>
                  ))}
                </div>
                <Separator className="mt-8" />
              </section>
            )}
            
            {/* Education */}
            {education && education.length > 0 && (
              <section>
                <h2 className="text-2xl font-headline font-bold mb-6 flex items-center"><GraduationCap className="mr-3 h-6 w-6 text-primary"/> Education</h2>
                <div className="space-y-4">
                  {education.map(edu => (
                    <div key={edu.id}>
                      <h3 className="font-semibold text-lg text-foreground">{edu.institution}</h3>
                      <p className="font-medium text-accent">{edu.degree}{edu.field ? `, ${edu.field}` : ''}</p>
                       <p className="text-sm text-muted-foreground mb-2">
                        {edu.startDate ? format(new Date(edu.startDate), 'MMM yyyy') : ''} {edu.endDate ? `- ${format(new Date(edu.endDate), 'MMM yyyy')}`: ''}
                      </p>
                      <p className="text-sm text-muted-foreground whitespace-pre-line">{edu.summary}</p>
                    </div>
                  ))}
                </div>
                 <Separator className="mt-8" />
              </section>
            )}
            
            {/* Projects */}
            {projects && projects.length > 0 && (
              <section>
                <h2 className="text-2xl font-headline font-bold mb-6 flex items-center"><Lightbulb className="mr-3 h-6 w-6 text-primary"/> Projects</h2>
                <div className="space-y-6">
                  {projects.map(proj => (
                    <div key={proj.id}>
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-lg text-foreground">{proj.title}</h3>
                        {proj.url && (
                          <a href={proj.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                            <Link2 className="h-4 w-4" />
                            <span className="sr-only">Project Link</span>
                          </a>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{proj.endDate ? `Completed: ${format(new Date(proj.endDate), 'MMM yyyy')}` : ''}</p>
                      <p className="text-sm text-muted-foreground mb-3 whitespace-pre-line">{proj.description}</p>
                      <div className="flex flex-wrap gap-3">
                         {proj.imageUrls?.map((url, index) => (
                           <div key={index} className="w-40 h-32 relative cursor-pointer group" onClick={() => setEnlargedImageUrl(convertGoogleDriveUrl(url))}>
                             <Image src={convertGoogleDriveUrl(url)} alt={`Project ${proj.title} image ${index+1}`} layout="fill" className="object-cover rounded-md border group-hover:opacity-80 transition-opacity" unoptimized />
                           </div>
                         ))}
                      </div>
                    </div>
                  ))}
                </div>
                 <Separator className="mt-8" />
              </section>
            )}

            {/* Certificates */}
            {certificates && certificates.length > 0 && (
              <section>
                <h2 className="text-2xl font-headline font-bold mb-6 flex items-center"><Award className="mr-3 h-6 w-6 text-primary"/> Certificates</h2>
                <div className="space-y-6">
                  {certificates.map(cert => (
                    <div key={cert.id}>
                      <h3 className="font-semibold text-lg text-foreground">{cert.title}</h3>
                      <p className="text-sm text-muted-foreground mb-2">{cert.date ? `Awarded: ${format(new Date(cert.date), 'MMM yyyy')}` : ''}</p>
                      <p className="text-sm text-muted-foreground mb-3 whitespace-pre-line">{cert.description}</p>
                       <div className="flex flex-wrap gap-3">
                         {cert.imageUrls?.map((url, index) => (
                           <div key={index} className="w-40 h-32 relative cursor-pointer group" onClick={() => setEnlargedImageUrl(convertGoogleDriveUrl(url))}>
                             <Image src={convertGoogleDriveUrl(url)} alt={`Certificate ${cert.title} image ${index+1}`} layout="fill" className="object-cover rounded-md border group-hover:opacity-80 transition-opacity" unoptimized />
                           </div>
                         ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

          </div>
        </div>
      </main>
      <PublicFooter />
      {enlargedImageUrl && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 cursor-zoom-out" onClick={() => setEnlargedImageUrl(null)}>
          <Image
            src={enlargedImageUrl}
            alt="Enlarged view"
            width={1200}
            height={800}
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
            unoptimized
          />
        </div>
      )}
    </div>
  );
}
