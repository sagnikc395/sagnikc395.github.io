import React from "react";

const Footer: React.FC = () => {
  return (
    <footer className="layout-md mt-20 text-lg flex flex-col">
      <div className="flex items-center space-x-4">
        <span className="text-stone-100">LinkedIn</span>
        <hr className="w-full mt-0.5 border-stone-700 border-dotted" />
        <a
          className="link"
          href="https://www.linkedin.com/in/sagnikchatterjee3/"
        >
          @sagnikchatterjee3
        </a>
      </div>
      <div className="flex items-center space-x-4">
        <span className="text-stone-100">Github</span>
        <hr className="w-full mt-0.5 border-stone-700 border-dotted" />
        <a className="link" href="https://github.com/sagnik395">
          @sagnik395
        </a>
      </div>
      <div className="flex items-center space-x-4">
        <span className="text-stone-100">Email</span>
        <hr className="w-full mt-0.5 border-stone-700 border-dotted" />
        <a className="link" href="mailto:sagnikchatterjee607@gmail.com">
          sagnikchatterjee607@gmail.com
        </a>
      </div>
      <div className="flex items-center space-x-4">
        <span className="text-stone-100">X</span>
        <hr className="w-full mt-0.5 border-stone-700 border-dotted" />
        <a className="link" href="https://x.com/sagnikcw">
          @sagnikcw
        </a>
      </div>
    </footer>
  );
};

export default Footer;
