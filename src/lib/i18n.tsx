import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Lang = "vi" | "en";

const dict = {
  vi: {
    "app.name": "Chat Vui",
    "app.tagline": "Nhắn tin nhóm vui nhộn, đơn giản, miễn phí",
    "nav.login": "Đăng nhập",
    "nav.signup": "Đăng ký",
    "nav.openApp": "Mở ứng dụng",
    "landing.cta": "Bắt đầu miễn phí",
    "landing.hero.title": "Trò chuyện nhóm thật vui",
    "landing.hero.subtitle": "Tạo nhóm, mời bạn bè, nhắn tin realtime với hình ảnh, file và nhiều biểu tượng cảm xúc.",
    "landing.feat1.title": "Realtime",
    "landing.feat1.desc": "Tin nhắn xuất hiện ngay lập tức nhờ WebSocket.",
    "landing.feat2.title": "Nhóm không giới hạn",
    "landing.feat2.desc": "Tạo bao nhiêu nhóm tuỳ thích với link mời.",
    "landing.feat3.title": "Bảo mật",
    "landing.feat3.desc": "Dữ liệu mã hoá, xác thực email, RLS bảo vệ từng dòng.",

    "auth.login": "Đăng nhập",
    "auth.signup": "Tạo tài khoản",
    "auth.email": "Email",
    "auth.password": "Mật khẩu",
    "auth.displayName": "Tên hiển thị",
    "auth.forgot": "Quên mật khẩu?",
    "auth.haveAccount": "Đã có tài khoản?",
    "auth.noAccount": "Chưa có tài khoản?",
    "auth.submit.login": "Đăng nhập",
    "auth.submit.signup": "Đăng ký",
    "auth.welcome": "Chào mừng trở lại!",
    "auth.create": "Tạo tài khoản mới",
    "auth.resetTitle": "Đặt lại mật khẩu",
    "auth.resetSent": "Đã gửi email đặt lại mật khẩu",
    "auth.resetSubmit": "Gửi email",
    "auth.newPassword": "Mật khẩu mới",
    "auth.update": "Cập nhật mật khẩu",

    "sidebar.search": "Tìm nhóm hoặc người...",
    "sidebar.newGroup": "Tạo nhóm mới",
    "sidebar.empty": "Chưa có nhóm nào. Tạo một cái nhé!",
    "sidebar.profile": "Hồ sơ",
    "sidebar.settings": "Cài đặt",
    "sidebar.logout": "Đăng xuất",
    "sidebar.friends": "Bạn bè",
    "sidebar.groups": "Nhóm",
    "sidebar.findFriends": "Tìm bạn bè",
    "sidebar.changeAvatar": "Thay đổi ảnh đại diện",

    "group.create": "Tạo nhóm",
    "group.name": "Tên nhóm",
    "group.description": "Mô tả",
    "group.members": "thành viên",
    "group.invite": "Mời bạn",
    "group.leave": "Rời nhóm",
    "group.delete": "Giải tán nhóm",
    "group.transfer": "Chuyển chủ nhóm",
    "group.transferConfirm": "Bạn có chắc chắn muốn chuyển quyền chủ nhóm cho người này?",
    "group.deleteConfirm": "Hành động này không thể hoàn tác. Toàn bộ tin nhắn sẽ bị xóa vĩnh viễn.",
    "group.leaveConfirm": "Bạn có chắc muốn rời nhóm?",
    "group.changeAvatar": "Đổi ảnh nhóm",

    "chat.placeholder": "Nhắn gì đó vui vẻ...",
    "chat.send": "Gửi",
    "chat.empty.title": "Chọn một nhóm để bắt đầu",
    "chat.empty.desc": "Hoặc tạo nhóm mới và mời bạn bè cùng tham gia!",
    "chat.reply": "Trả lời",
    "chat.edit": "Chỉnh sửa",
    "chat.delete": "Xoá",
    "chat.deleted": "Tin nhắn đã bị xoá",
    "chat.edited": "đã sửa",
    "chat.replyingTo": "Đang trả lời",
    "chat.cancel": "Huỷ",
    "chat.attach": "Đính kèm",
    "chat.today": "Hôm nay",
    "chat.yesterday": "Hôm qua",
    "chat.loadMore": "Tải thêm tin nhắn cũ",
    "chat.deleteConfirm": "Bạn chắc chắn muốn xóa tin nhắn này?",
    "chat.deleteSuccess": "Đã xóa tin nhắn",
    "chat.image": "Ảnh",
    "chat.video": "Video",
    "chat.file": "Tệp",

    "friends.search": "Tìm người dùng...",
    "friends.empty": "Chưa có bạn bè nào",
    "friends.pending": "Lời mời kết bạn",
    "friends.add": "Thêm bạn",
    "friends.sent": "Đã gửi lời mời",
    "friends.accept": "Chấp nhận",
    "friends.decline": "Từ chối",

    "dm.start": "Nhắn tin",
    "dm.title": "Chat riêng",

    "call.voice": "Gọi thoại",
    "call.video": "Gọi video",
    "call.join": "Tham gia ngay",
    "call.ended": "Cuộc gọi đã kết thúc",
    "call.calling": "đang gọi",
    "call.video_call": "video",
    "call.voice_call": "thoại",

    "permissions.title": "Thành viên nhóm",
    "permissions.membersCount": "người đang tham gia",
    "permissions.chat": "Chat",
    "permissions.call": "Gọi",
    "permissions.label": "Quyền hạn",
    "permissions.admin": "Admin",
    "permissions.owner": "Chủ nhóm",
    "permissions.member": "Thành viên",
    "permissions.lockChat": "Chỉ Admin mới được nhắn tin",
    "permissions.promote": "Thăng cấp Admin",
    "permissions.demote": "Gỡ quyền Admin",
    "permissions.readOnly": "Chế độ xem",
    "permissions.denied": "Bạn không có quyền nhắn tin trong nhóm này",

    "common.save": "Lưu",
    "common.cancel": "Huỷ",
    "common.confirm": "Xác nhận",
    "common.loading": "Đang tải...",
    "common.error": "Có lỗi xảy ra",
    "common.success": "Thành công",
    "common.theme.light": "Sáng",
    "common.theme.dark": "Tối",
    "common.lang": "Ngôn ngữ",
    "common.notFound": "Trang này không tồn tại.",
    "common.backHome": "Về trang chủ",
    "common.retry": "Thử lại",
  },
  en: {
    "app.name": "Chat Vui",
    "app.tagline": "Fun, simple, free group messaging",
    "nav.login": "Sign in",
    "nav.signup": "Sign up",
    "nav.openApp": "Open app",
    "landing.cta": "Start free",
    "landing.hero.title": "Group chat made joyful",
    "landing.hero.subtitle": "Create groups, invite friends, message in realtime with images, files and tons of emoji.",
    "landing.feat1.title": "Realtime",
    "landing.feat1.desc": "Messages appear instantly over WebSocket.",
    "landing.feat2.title": "Unlimited groups",
    "landing.feat2.desc": "Spin up as many groups as you like with invite links.",
    "landing.feat3.title": "Secure",
    "landing.feat3.desc": "Email auth, encryption in transit, row-level security.",

    "auth.login": "Sign in",
    "auth.signup": "Sign up",
    "auth.email": "Email",
    "auth.password": "Password",
    "auth.displayName": "Display name",
    "auth.forgot": "Forgot password?",
    "auth.haveAccount": "Already have an account?",
    "auth.noAccount": "Don't have an account?",
    "auth.submit.login": "Sign in",
    "auth.submit.signup": "Create account",
    "auth.welcome": "Welcome back!",
    "auth.create": "Create your account",
    "auth.resetTitle": "Reset password",
    "auth.resetSent": "Reset email sent",
    "auth.resetSubmit": "Send email",
    "auth.newPassword": "New password",
    "auth.update": "Update password",

    "sidebar.search": "Search groups or people...",
    "sidebar.newGroup": "New group",
    "sidebar.empty": "No groups yet. Create one!",
    "sidebar.profile": "Profile",
    "sidebar.settings": "Settings",
    "sidebar.logout": "Sign out",
    "sidebar.friends": "Friends",
    "sidebar.groups": "Groups",
    "sidebar.findFriends": "Find friends",
    "sidebar.changeAvatar": "Change avatar",

    "group.create": "Create group",
    "group.name": "Group name",
    "group.description": "Description",
    "group.members": "members",
    "group.invite": "Invite",
    "group.leave": "Leave",
    "group.delete": "Delete group",
    "group.transfer": "Transfer Ownership",
    "group.transferConfirm": "Are you sure you want to transfer ownership to this person?",
    "group.deleteConfirm": "This action cannot be undone. All messages and data will be permanently deleted.",
    "group.leaveConfirm": "Are you sure you want to leave the group?",
    "group.changeAvatar": "Change group avatar",

    "chat.placeholder": "Say something fun...",
    "chat.send": "Send",
    "chat.empty.title": "Pick a group to start",
    "chat.empty.desc": "Or create a new one and invite your friends!",
    "chat.reply": "Reply",
    "chat.edit": "Edit",
    "chat.delete": "Delete",
    "chat.deleted": "Message deleted",
    "chat.edited": "edited",
    "chat.replyingTo": "Replying to",
    "chat.cancel": "Cancel",
    "chat.attach": "Attach",
    "chat.today": "Today",
    "chat.yesterday": "Yesterday",
    "chat.loadMore": "Load more messages",
    "chat.deleteConfirm": "Are you sure you want to delete this message?",
    "chat.deleteSuccess": "Message deleted",
    "chat.image": "Image",
    "chat.video": "Video",
    "chat.file": "File",

    "friends.search": "Search users...",
    "friends.empty": "No friends yet",
    "friends.pending": "Friend requests",
    "friends.add": "Add friend",
    "friends.sent": "Request sent",
    "friends.accept": "Accept",
    "friends.decline": "Decline",

    "dm.start": "Message",
    "dm.title": "Direct Message",

    "call.voice": "Voice call",
    "call.video": "Video call",
    "call.join": "Join now",
    "call.ended": "Call ended",
    "call.calling": "is calling",
    "call.video_call": "video",
    "call.voice_call": "voice",

    "permissions.title": "Group members",
    "permissions.membersCount": "members participating",
    "permissions.chat": "Chat",
    "permissions.call": "Call",
    "permissions.label": "Permissions",
    "permissions.admin": "Admin",
    "permissions.owner": "Owner",
    "permissions.member": "Member",
    "permissions.lockChat": "Only admins can message",
    "permissions.promote": "Promote to Admin",
    "permissions.demote": "Demote to Member",
    "permissions.readOnly": "View only",
    "permissions.denied": "You don't have permission to message in this group",

    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.confirm": "Confirm",
    "common.loading": "Loading...",
    "common.error": "Something went wrong",
    "common.success": "Success",
    "common.theme.light": "Light",
    "common.theme.dark": "Dark",
    "common.lang": "Language",
    "common.notFound": "Page not found.",
    "common.backHome": "Back to home",
    "common.retry": "Try again",
  },
} as const;

type Key = keyof (typeof dict)["vi"];

interface I18nCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: Key) => string;
}

const Ctx = createContext<I18nCtx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("vi");

  useEffect(() => {
    const saved = (typeof window !== "undefined" && localStorage.getItem("lang")) as Lang | null;
    if (saved === "vi" || saved === "en") setLangState(saved);
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    if (typeof window !== "undefined") localStorage.setItem("lang", l);
  };

  const t = (key: Key) => dict[lang][key] ?? key;

  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
