export function ProfileButton() {
  return (
    <a
      href="#"
      className="flex items-center gap-x-4 px-6 py-3 text-sm/6 font-semibold text-gray-900 hover:bg-gray-50 dark:text-white dark:hover:bg-white/5"
    >
      <img
        alt=""
        src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
        className="size-8 rounded-full bg-gray-50 outline -outline-offset-1 outline-black/5 dark:bg-gray-800 dark:outline-white/10"
      />
      <span className="sr-only">Your profile</span>
      <span aria-hidden="true">Tom Cook</span>
    </a>
  );
}
