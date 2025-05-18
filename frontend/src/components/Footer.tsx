import { Home, Mail } from 'lucide-react';
import React from 'react';

interface FooterProps {
    companyName: string;
    copyrightYear: string;
    socialLinks?: {
        name: string;
        url: string;
        icon: React.ReactNode; // You can use icons from libraries like 'lucide-react'
    }[];
    contactEmail?: string;
    address?: string;
    additionalLinks?: {
        text: string;
        url: string;
    }[];
}

const Footer: React.FC<FooterProps> = ({
    companyName,
    copyrightYear,
    socialLinks = [],
    contactEmail,
    address,
    additionalLinks = [],
}) => {
    return (
        <>
        <div className='bg-slate-300 w-full h-[1px] '></div>
        <footer className="bg-slate-100 text-black py-6 md:py-8 ">
            
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {/* Company Info */}
                    <div>
                        <h3 className="text-lg font-semibold text-black mb-2">{companyName}</h3>
                        {address && (
                            <p className="text-sm flex items-center gap-1">
                                <Home size={15} className='font-normal'/>
                                {address}
                            </p>
                        )}
                        {contactEmail && (
                            <p className="text-sm flex items-center gap-1">
                                <Mail size={15} className='font-normal'/> {contactEmail}
                            </p>
                        )}
                    </div>

                    {/* Social Links */}
                    {socialLinks.length > 0 && (
                        <div>
                            <h3 className="text-lg font-semibold text-black mb-4">Follow Us</h3>
                            <div className="flex space-x-4">
                                {socialLinks.map((link, index) => (
                                    <a
                                        key={index}
                                        href={link.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="hover:text-black transition-colors"
                                        aria-label={link.name}
                                    >
                                        {link.icon}
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Additional Links */}
                    {additionalLinks.length > 0 && (
                        <div>
                            <h3 className="text-lg font-semibold text-black mb-4">Useful Links</h3>
                            <ul className="space-y-2">
                                {additionalLinks.map((link, index) => (
                                    <li key={index}>
                                        <a
                                            href={link.url}
                                            className="hover:text-black transition-colors"
                                        >
                                            {link.text}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                {/* Copyright */}
                <div className="mt-6 md:mt-8 text-center text-sm">
                    &copy; {copyrightYear} {companyName}. All rights reserved.
                </div>
            </div>
        </footer>
        </>
    );
};

const FooterDemo = () => {
      const socialLinks = [
        { name: 'Facebook', url: 'https://www.facebook.com', icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-facebook"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg> },
        { name: 'Twitter', url: 'https://twitter.com', icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-twitter"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/></svg> },
        { name: 'Instagram', url: 'https://instagram.com', icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-instagram"><path d="M4 4h16c1.3 0 2.3 1 2.3 2.3v10.8c0 1.3-1 2.3-2.3 2.3H4c-1.3 0-2.3-1-2.3-2.3V6.3C1.7 5 2.7 4 4 4z"/><path d="M12 15.2c-1.8 0-3.2-1.4-3.2-3.2 0-1.8 1.4-3.2 3.2-3.2 1.8 0 3.2 1.4 3.2 3.2 0 1.8-1.4 3.2-3.2 3.2z"/><path d="M18.4 7.2v.1"/></svg> },
    ];

    const additionalLinks = [
    { text: 'Privacy Policy', url: '/privacy' },
    { text: 'Terms of Service', url: '/terms' },
    { text: 'About Us', url: '/about' },
  ];

    return (
        <Footer
            companyName="JustHire"
            copyrightYear="2024"
            socialLinks={socialLinks}
            contactEmail="info@justhire.com"
            address="Shivaji Nagar, Bengaluru"
            additionalLinks={additionalLinks}
        />
    );
}

export default FooterDemo;
