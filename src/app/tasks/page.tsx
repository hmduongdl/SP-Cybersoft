import TaskManagerMain from "@/components/modules/tasks/TaskManagerMain";

export const metadata = {
  title: "Task Manager | SP-CyberSoft",
  description: "Quản lý công việc thông minh với RAG AI",
};

export default function TasksPage() {
  return (
    <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-surface-mid dark:bg-[#131b2e]">
      <TaskManagerMain />
    </div>
  );
}
