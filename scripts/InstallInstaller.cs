using System;
using System.Diagnostics;
using System.IO;

namespace GearShift
{
    class Program
    {
        static void Main(string[] args)
        {
            Console.Title = "GearShift — Arduino MCP & CLI Dependency Installer";
            Console.ForegroundColor = ConsoleColor.Cyan;
            Console.WriteLine("==========================================================================");
            Console.WriteLine("   GearShift — Arduino CLI, MCP Server & NFC Hardware Installer (.EXE)");
            Console.WriteLine("==========================================================================");
            Console.ResetColor();
            Console.WriteLine();

            string baseDir = AppDomain.CurrentDomain.BaseDirectory;
            string scriptPath = Path.Combine(baseDir, "scripts", "install-arduino-mcp.ps1");

            if (!File.Exists(scriptPath))
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine("[ERROR] Could not find installation script at: " + scriptPath);
                Console.ResetColor();
                Console.WriteLine("\nPress any key to exit...");
                try { Console.ReadKey(); } catch { }
                return;
            }

            ProcessStartInfo psi = new ProcessStartInfo
            {
                FileName = "powershell.exe",
                Arguments = "-NoProfile -ExecutionPolicy Bypass -File \"" + scriptPath + "\"",
                UseShellExecute = false,
                RedirectStandardOutput = false,
                RedirectStandardError = false,
                CreateNoWindow = false
            };

            try
            {
                Process proc = Process.Start(psi);
                proc.WaitForExit();

                Console.WriteLine();
                if (proc.ExitCode == 0)
                {
                    Console.ForegroundColor = ConsoleColor.Green;
                    Console.WriteLine("[SUCCESS] All Arduino CLI, MCP Server, cores, and libraries installed successfully!");
                }
                else
                {
                    Console.ForegroundColor = ConsoleColor.Yellow;
                    Console.WriteLine("[WARNING] Installer finished with exit code: " + proc.ExitCode);
                }
                Console.ResetColor();
            }
            catch (Exception ex)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine("[ERROR] Failed to start installer process: " + ex.Message);
                Console.ResetColor();
            }

            Console.WriteLine("\nPress any key to close this window...");
            try { Console.ReadKey(); } catch { }
        }
    }
}
