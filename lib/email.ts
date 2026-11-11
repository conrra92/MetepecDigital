type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

export function getAdminNotificationsEmail() {
  const email = process.env.GUIDE_APPLICATIONS_EMAIL?.trim();
  if (!email) {
    throw new Error("Falta configurar GUIDE_APPLICATIONS_EMAIL para notificar a administración.");
  }
  return email;
}

export async function sendEmail(message: EmailMessage) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    throw new Error("No se pudo enviar el correo: configura RESEND_API_KEY y EMAIL_FROM en el servidor.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [message.to],
      subject: message.subject,
      text: message.text,
      html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#3d2b25">${message.html}</div>`,
    }),
  });

  if (!response.ok) {
    console.error("Email provider request failed", { status: response.status });
    throw new Error(`El proveedor de correo rechazó la notificación (HTTP ${response.status}). Verifica el remitente EMAIL_FROM en Resend.`);
  }
}

export function emailFailureNotice(error: unknown) {
  if (error instanceof Error && error.message.startsWith("No se pudo enviar el correo:")) {
    return error.message;
  }
  if (error instanceof Error && error.message.startsWith("Falta configurar GUIDE_APPLICATIONS_EMAIL")) {
    return `No se pudo enviar el correo: ${error.message}`;
  }
  if (error instanceof Error && error.message.startsWith("El proveedor de correo rechazó")) {
    return error.message;
  }
  return "No se pudo enviar el correo. Verifica la configuración de Resend y vuelve a intentarlo.";
}

export function guideApplicationEmailContent(
  name: string,
  status: "approved" | "rejected",
  adminResponse: string,
) {
  const approved = status === "approved";
  const responseText = adminResponse || (approved ? "Tu cuenta de guía ya está activa." : "Tu solicitud no fue aprobada.");
  return {
    subject: approved
      ? "Tu cuenta de guía de Metepec fue aprobada"
      : "Actualización sobre tu solicitud para ser guía",
    text: `Hola ${name},\n\n${responseText}${approved ? "\nYa puedes iniciar sesión en Metepec Digital y entrar al panel de guía." : ""}`,
    html: `<p>Hola ${escapeHtml(name)},</p><p>${escapeHtml(responseText)}</p>${approved ? "<p>Ya puedes iniciar sesión en Metepec Digital y entrar al panel de guía.</p>" : ""}`,
  };
}

export function newGuideApplicationEmailContent(
  name: string,
  email: string,
  plate: string,
  model: string,
  vehicleYear: number,
) {
  return {
    subject: "Nueva solicitud para registrarse como guía",
    text: `Se recibió una solicitud de ${name} (${email}). Vehículo: ${model} ${vehicleYear}, placa ${plate}. Revisa la solicitud en el panel administrativo de guías.`,
    html: `<p>Se recibió una solicitud para registrarse como guía.</p><p><strong>Nombre:</strong> ${escapeHtml(name)}<br><strong>Correo:</strong> ${escapeHtml(email)}<br><strong>Vehículo:</strong> ${escapeHtml(model)} ${vehicleYear}<br><strong>Placa:</strong> ${escapeHtml(plate)}</p><p>Revisa la solicitud en el panel administrativo de guías.</p>`,
  };
}

export function newBusinessApplicationEmailContent(application: {
  businessName: string;
  category: string;
  description: string;
  address: string;
  phone: string;
  hours: string;
  requesterName: string;
  requesterEmail: string;
}) {
  return {
    subject: `Nueva solicitud de alta de negocio: ${application.businessName}`,
    text: [
      `Se recibió una solicitud de alta para ${application.businessName}.`,
      `Solicitante: ${application.requesterName} (${application.requesterEmail})`,
      `Giro: ${application.category}`,
      `Descripción: ${application.description}`,
      `Dirección: ${application.address}`,
      `Teléfono: ${application.phone}`,
      `Horario: ${application.hours}`,
      "Revisa la solicitud en el panel administrativo de Metepec Digital.",
    ].join("\n\n"),
    html: `<p>Se recibió una solicitud de alta de negocio.</p><p><strong>Negocio:</strong> ${escapeHtml(application.businessName)}<br><strong>Solicitante:</strong> ${escapeHtml(application.requesterName)} (${escapeHtml(application.requesterEmail)})<br><strong>Giro:</strong> ${escapeHtml(application.category)}<br><strong>Descripción:</strong> ${escapeHtml(application.description)}<br><strong>Dirección:</strong> ${escapeHtml(application.address)}<br><strong>Teléfono:</strong> ${escapeHtml(application.phone)}<br><strong>Horario:</strong> ${escapeHtml(application.hours)}</p><p>Revisa la solicitud en el panel administrativo de Metepec Digital.</p>`,
  };
}

export function businessApplicationDecisionEmailContent(
  businessName: string,
  status: "approved" | "rejected",
  adminResponse: string,
  destinationEmail: string,
) {
  const approved = status === "approved";
  const responseText = adminResponse || (approved
    ? "Tu solicitud fue aprobada."
    : "Tu solicitud no fue aprobada.");
  const accessText = approved
    ? ` La cuenta asignada para administrar el destino es ${destinationEmail}.`
    : "";
  return {
    subject: approved
      ? `Solicitud aprobada: ${businessName}`
      : `Actualización sobre la solicitud de ${businessName}`,
    text: `Hola,\n\n${responseText}${accessText}`,
    html: `<p>Hola,</p><p>${escapeHtml(responseText)}${escapeHtml(accessText)}</p>`,
  };
}
